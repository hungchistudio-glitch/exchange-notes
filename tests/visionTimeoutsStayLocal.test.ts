import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * 2026-09-28 12:39 UTC: two camera timeouts put both lite models away for
 * every feature, and the word lookups a minute later skipped them, met a
 * busy gemini-3.6-flash, and all fell back to the offline dictionary. A
 * photograph is slower than a word; its timeout now stays with the camera.
 * A quota refusal is still shared — that is a fact about the model.
 */

const markModelAway = vi.fn();

vi.mock("@/lib/ai/modelHealth", () => ({
  awayFor: (failure: { rateLimited: boolean; timedOut: boolean; message: string }) =>
    failure.rateLimited
      ? { until: Date.now() + 60_000, reason: "rate_limit" }
      : failure.timedOut
        ? { until: Date.now() + 60_000, reason: "timeout" }
        : null,
  markModelAway: (...args: unknown[]) => markModelAway(...args),
}));

vi.mock("@/lib/ai/callLog", () => ({ recordAiFailure: () => {} }));

import { generateJson } from "@/lib/ai/modelRequest";

function clientFailingWith(error: Error) {
  return {
    models: {
      generateContent: async () => {
        throw error;
      },
    },
  } as never;
}

const timeout = Object.assign(new Error("Deadline expired"), { status: 504 });
const quota = Object.assign(new Error("quota exceeded"), { status: 429 });

beforeEach(() => markModelAway.mockReset());

describe("generateJson's shared health marks", () => {
  it("shares a text timeout with every feature", async () => {
    await expect(
      generateJson(clientFailingWith(timeout), { model: "m", input: "hi" }),
    ).rejects.toThrow();
    expect(markModelAway).toHaveBeenCalledWith("m", expect.objectContaining({ reason: "timeout" }));
  });

  it("keeps a photograph's timeout to itself", async () => {
    await expect(
      generateJson(clientFailingWith(timeout), {
        model: "m",
        input: "hi",
        shareTimeouts: false,
      }),
    ).rejects.toThrow();
    expect(markModelAway).not.toHaveBeenCalled();
  });

  it("still shares a quota refusal from a photograph", async () => {
    await expect(
      generateJson(clientFailingWith(quota), {
        model: "m",
        input: "hi",
        shareTimeouts: false,
      }),
    ).rejects.toThrow();
    expect(markModelAway).toHaveBeenCalledWith("m", expect.objectContaining({ reason: "rate_limit" }));
  });
});
