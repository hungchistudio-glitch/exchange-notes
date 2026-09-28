import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ANALYSIS_FALLBACK_PAUSE_MS,
  messageAnalysisPausedUntil,
  pauseMessageAnalysis,
  requestMessageAnalysis,
  resetMessageAnalysisPauseForTests,
} from "@/lib/messages/decode";

/*
 * 2026-09-25: the quota ran out with a conversation open, and the screen
 * asked about every message on it in turn — eleven refusals in four
 * seconds. A refusal now carries "not until", and the app holds off.
 */

function respond(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }),
  );
}

beforeEach(() => resetMessageAnalysisPauseForTests());
afterEach(() => vi.unstubAllGlobals());

describe("requestMessageAnalysis", () => {
  it("returns the analysis when there is one", async () => {
    const analysis = { messageId: 1, status: "skipped", tone: null, toneConfidence: null, phrases: [] };
    respond(200, { analysis });

    await expect(requestMessageAnalysis(1)).resolves.toEqual({ kind: "analysis", analysis });
  });

  it("passes on the time the route says to wait until", async () => {
    const until = Date.now() + 6 * 60 * 60 * 1000;
    respond(503, { error: "resting", pauseUntil: until });

    await expect(requestMessageAnalysis(1)).resolves.toEqual({ kind: "paused", until });
  });

  it("holds off briefly when a failure does not say how long", async () => {
    respond(500, { error: "Couldn't read this message right now." });
    const before = Date.now();

    const outcome = await requestMessageAnalysis(1);

    expect(outcome.kind).toBe("paused");
    if (outcome.kind === "paused") {
      expect(outcome.until).toBeGreaterThanOrEqual(before + ANALYSIS_FALLBACK_PAUSE_MS);
    }
  });

  it("treats a network failure the same way", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(requestMessageAnalysis(1)).resolves.toMatchObject({ kind: "paused" });
  });
});

describe("the app-wide pause", () => {
  it("is off until something sets it", () => {
    expect(messageAnalysisPausedUntil()).toBe(0);
  });

  it("holds until the time it was given, and not after", () => {
    const now = Date.now();
    pauseMessageAnalysis(now + 60_000);

    expect(messageAnalysisPausedUntil(now)).toBe(now + 60_000);
    expect(messageAnalysisPausedUntil(now + 60_001)).toBe(0);
  });

  it("survives a reload through localStorage", () => {
    const until = Date.now() + 60_000;
    pauseMessageAnalysis(until);

    expect(window.localStorage.getItem("exchange-notes:message-analysis-paused-until")).toBe(
      String(until),
    );
  });

  it("never shortens a longer pause", () => {
    const now = Date.now();
    pauseMessageAnalysis(now + 120_000);
    pauseMessageAnalysis(now + 60_000);

    expect(messageAnalysisPausedUntil(now)).toBe(now + 120_000);
  });
});
