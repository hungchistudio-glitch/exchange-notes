import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCallback, useState } from "react";

import { createAnnotationBackoff } from "@/lib/offline/annotationBackoff";
import { useVocabularyLanguageFill } from "@/hooks/useVocabularyLanguageFill";
import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import type { LanguageCode } from "@/lib/languages";
import type { VocabularyItem } from "@/lib/types/app";

/* =========================================================
   A spent allowance is not a busy minute

   /api/text-translate and /api/vocabulary/translate reach Gemini and, unlike
   the app's six other model-backed routes, drew on no daily allowance — one
   account could spend the project's whole budget. They are counted now.

   Counting them makes the clients' business: a limit the client hammers is a
   limit that costs as much to enforce as to exceed. Both callers are
   background loops, so "you have none left" has to stop them, not slow them.
   ========================================================= */

vi.mock("@/hooks/i18n/useTranslation", () => ({
  default: () => ({
    t: { vocabulary: { detail: { listenAriaLabel: "Listen to {text}" } } },
  }),
}));

vi.mock("@/lib/speech", () => ({ speak: vi.fn() }));

/* ---------- the library fill ---------- */

const LIBRARY_SIZE = 60;

/** A library with nothing in the language being learned, so the fill runs. */
function makeItems(): VocabularyItem[] {
  return Array.from({ length: LIBRARY_SIZE }, (_, index) => ({
    id: `w${index}`,
    user_id: "u",
    word: "word",
    translation: "字",
    language: "en",
    word_language: "en",
    translation_language: "zh-TW",
    texts: { en: "word", "zh-TW": "字" },
    examples: {},
    category: "other",
    favorite: false,
    part_of_speech: null,
    example_sentence: null,
    translated_example: null,
    image_url: null,
    confidence: null,
    status: "new",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  })) as VocabularyItem[];
}

function FillHarness({ language = "it" as LanguageCode }) {
  const [items] = useState(makeItems);
  const onFilled = useCallback(() => {}, []);

  const { filling } = useVocabularyLanguageFill({
    items,
    learningLanguage: language,
    loading: false,
    onFilled,
  });

  return <span data-testid="filling">{filling ? "yes" : "no"}</span>;
}

describe("the library fill, once the day's batches are spent", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stops at the first 429 instead of retrying into it", async () => {
    const calls: string[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        calls.push(init.body);

        return {
          ok: false,
          status: 429,
          json: async () => ({
            error: "You have reached today's limit for filling in your library.",
            filled: 0,
            done: true,
            quotaExhausted: true,
          }),
        };
      }),
    );

    render(<FillHarness />);

    /*
     * The generic failure path allows three attempts with 1.5s and 4s of
     * backoff between them, which is right for a busy model and wrong here:
     * the answer cannot change before the reader's own midnight. One call,
     * and the language is set aside for the session.
     */
    await waitFor(() => expect(calls.length).toBe(1));

    await new Promise((resolve) => setTimeout(resolve, 2_500));

    expect(calls.length).toBe(1);
  });
});

/* ---------- holding a key for a stated time ---------- */

describe("holdFor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("holds for the time given rather than the next escalating step", () => {
    const backoff = createAnnotationBackoff(() => {});

    backoff.holdFor("en:cascade", 60_000);

    vi.advanceTimersByTime(31_000);

    // note() would have released it by now — thirty seconds is its longest
    // step. This one was told a number and keeps to it.
    expect(backoff.held("en:cascade")).toBe(true);

    vi.advanceTimersByTime(30_000);
    expect(backoff.held("en:cascade")).toBe(false);
  });

  it("never shortens a hold already in place", () => {
    const backoff = createAnnotationBackoff(() => {});

    backoff.holdFor("en:threshold", 60_000);
    backoff.holdFor("en:threshold", 1_000);

    vi.advanceTimersByTime(5_000);

    // Two reasons to wait mean waiting for the longer of them.
    expect(backoff.held("en:threshold")).toBe(true);
  });

  it("still lets a success clear it", () => {
    const backoff = createAnnotationBackoff(() => {});

    backoff.holdFor("en:luminous", 60_000);
    backoff.clear("en:luminous");

    expect(backoff.held("en:luminous")).toBe(false);
  });
});

/* ---------- the annotation store's own limit ---------- */

describe("an annotation store told the allowance is gone", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not keep asking on the thirty-second cadence", async () => {
    /*
     * The phonetics store shares its backoff with the translation store, so
     * this covers the mechanism both rely on: a failure that is answered
     * `unavailable` settles at one request every thirty seconds, which over a
     * day against a spent allowance is two thousand eight hundred requests
     * for an answer that cannot change.
     */
    let calls = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;

        return {
          ok: true,
          json: async () => ({ phonetics: {}, unavailable: ["meridian"] }),
        };
      }),
    );

    render(<PronunciationBlock entries={[{ text: "meridian", language: "en" }]} />);

    await waitFor(() => expect(calls).toBeGreaterThan(0));

    const afterFirst = calls;

    await new Promise((resolve) => setTimeout(resolve, 1_200));

    // One retry at the first step, not twenty-four batch windows' worth.
    expect(calls - afterFirst).toBeLessThanOrEqual(2);
  });
});
