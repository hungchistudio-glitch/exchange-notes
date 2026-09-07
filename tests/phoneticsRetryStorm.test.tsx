import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";

/* =========================================================
   A lookup that fails must not be asked for again immediately

   The annotation stores end every flush in `notify`, `notify` re-renders
   every subscriber, and a subscriber asks for its words during render. A
   failure is deliberately not cached, so nothing sat between a failed
   lookup and the next one: the flush failed, the cards re-rendered, and the
   same words went out again one batch window later — measured at 28
   requests a second on the word-card screen, indefinitely, against a route
   answering 401.

   The old tests could not see it. Every one of them served `ok: true`, and
   on a good response the loop does not exist: the answer is cached and the
   next render asks for nothing. These serve failures instead.
   ========================================================= */

vi.mock("@/hooks/i18n/useTranslation", () => ({
  default: () => ({
    t: { vocabulary: { detail: { listenAriaLabel: "Listen to {text}" } } },
  }),
}));

vi.mock("@/lib/speech", () => ({ speak: vi.fn() }));

/*
 * A distinct word per case, because the store is module-level on purpose
 * and outlives a single test — the same property that makes it one request
 * across a whole screen.
 */

const BATCH_WINDOW_MS = 50;

/** Long enough for many batch windows, short enough for a test. */
const OBSERVATION_MS = 1_000;

/**
 * How many requests the first backoff step allows in that window.
 *
 * One immediately, and one more when the second-long hold expires. The point
 * of the test is the order of magnitude — twenty batch windows fit in a
 * second, and the bug produced a request in every one of them.
 */
const TOLERATED = 4;

function countingFetch(response: () => unknown) {
  const calls: string[] = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: { body: string }) => {
      calls.push(init.body);
      return response();
    }),
  );

  return calls;
}

async function observe() {
  await new Promise((resolve) => setTimeout(resolve, OBSERVATION_MS));
}

describe("a failing phonetics lookup", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not ask again every batch window when the route refuses", async () => {
    const calls = countingFetch(() => ({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    }));

    render(
      <PronunciationBlock entries={[{ text: "serendipity", language: "en" }]} />,
    );

    await observe();

    expect(calls.length).toBeGreaterThan(0);
    expect(calls.length).toBeLessThanOrEqual(TOLERATED);
  });

  it("does not ask again every batch window when the request throws", async () => {
    const calls: string[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        calls.push(init.body);
        throw new Error("Network request failed");
      }),
    );

    render(<PronunciationBlock entries={[{ text: "ephemeral", language: "en" }]} />);

    await observe();

    expect(calls.length).toBeGreaterThan(0);
    expect(calls.length).toBeLessThanOrEqual(TOLERATED);
  });

  it("does not ask again every batch window for a word the server could not reach", async () => {
    /*
     * The subtler half. This response is a success — `ok`, parsed, with an
     * answer for one word and the other named in `unavailable`. The reachable
     * word is cached and stops being asked for; the unreachable one is not
     * cached on purpose, and used to loop on its own.
     */
    const calls = countingFetch(() => ({
      ok: true,
      json: async () => ({
        phonetics: { luminous: { ipa: "/ˈluːmɪnəs/" } },
        unavailable: ["cascade"],
      }),
    }));

    render(
      <PronunciationBlock
        entries={[
          { text: "luminous", language: "en" },
          { text: "cascade", language: "en" },
        ]}
      />,
    );

    await observe();

    expect(calls.length).toBeGreaterThan(0);
    expect(calls.length).toBeLessThanOrEqual(TOLERATED);
  });

  it("still asks once more, so the annotation arrives when the route recovers", async () => {
    let refuse = true;

    const calls = countingFetch(() =>
      refuse
        ? { ok: false, status: 500, json: async () => ({}) }
        : {
            ok: true,
            json: async () => ({ phonetics: { threshold: { ipa: "/ˈθrɛʃhoʊld/" } } }),
          },
    );

    const view = render(
      <PronunciationBlock entries={[{ text: "threshold", language: "en" }]} />,
    );

    await new Promise((resolve) => setTimeout(resolve, BATCH_WINDOW_MS * 4));
    expect(calls.length).toBe(1);

    refuse = false;

    /*
     * Nothing touches the screen here. Holding a word back must not mean
     * abandoning it: the store wakes itself when the hold expires, which is
     * what a reader who put the phone down in a tunnel depends on.
     */
    await observe();

    expect(calls.length).toBeGreaterThan(1);
    expect(await view.findByText("/ˈθrɛʃhoʊld/")).toBeTruthy();
  });
});
