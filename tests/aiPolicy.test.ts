import { beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   How the app asks when Google is full (2026-09-28)

   For hours every model answered 503, and every feature asked every model
   on every request — six refusals a lookup, 20–30 seconds before a
   fallback, and automatic IPA spending the reserve model within the hour.
   ========================================================= */

import { firstAnswer } from "@/lib/ai/hedge";
import {
  awayFor,
  backgroundAllowed,
  healthyModels,
  markModelAway,
  resetModelHealthForTests,
} from "@/lib/ai/modelHealth";

describe("a 503 is remembered", () => {
  it("puts the model away as busy, briefly", () => {
    const now = 1_000_000;
    expect(
      awayFor({ rateLimited: false, timedOut: false, message: "high demand", status: 503 }, 0, now),
    ).toEqual({ until: now + 45_000, reason: "busy" });
  });

  it("does not for an ordinary refusal", () => {
    expect(awayFor({ rateLimited: false, timedOut: false, message: "bad", status: 400 }, 0)).toBeNull();
  });
});

describe("when every model is marked", () => {
  const models = ["a", "b", "c"];

  beforeEach(async () => {
    resetModelHealthForTests();
    await healthyModels(models); // prime the per-instance view
  });

  it("asks the one whose mark ends soonest, and only that one", async () => {
    const now = Date.now();
    await markModelAway("a", { until: now + 60_000, reason: "busy" });
    await markModelAway("b", { until: now + 10_000, reason: "timeout" });
    await markModelAway("c", { until: now + 3_600_000, reason: "daily_quota" });

    await expect(healthyModels(models)).resolves.toEqual(["b"]);
  });

  it("asks none when every model is out for the day", async () => {
    const until = Date.now() + 3_600_000;
    for (const model of models) await markModelAway(model, { until, reason: "daily_quota" });

    await expect(healthyModels(models)).resolves.toEqual([]);
  });

  it("allows background work only with two models to spare", async () => {
    await expect(backgroundAllowed(models)).resolves.toBe(true);

    await markModelAway("a", { until: Date.now() + 60_000, reason: "busy" });
    await markModelAway("b", { until: Date.now() + 60_000, reason: "busy" });

    await expect(backgroundAllowed(models)).resolves.toBe(false);
  });
});

describe("firstAnswer's cap", () => {
  it("asks no more models than it is allowed", async () => {
    const attempt = vi.fn().mockRejectedValue(new Error("503"));

    const answered = await firstAnswer(["a", "b", "c", "d", "e", "f"], attempt, {
      hedgeAfterMs: 4_000,
      deadline: Date.now() + 20_000,
      minAttemptMs: 0,
      maxAttemptMs: 1_000,
      maxAttempts: 3,
    });

    expect(answered).toBeNull();
    expect(attempt).toHaveBeenCalledTimes(3);
  });

  it("never hedges when told not to", async () => {
    vi.useFakeTimers();
    const attempt = vi.fn(() => new Promise<string>(() => {}));

    void firstAnswer(["a", "b"], attempt, {
      hedgeAfterMs: Number.POSITIVE_INFINITY,
      deadline: Date.now() + 20_000,
      minAttemptMs: 0,
      maxAttemptMs: 10_000,
    });
    await vi.advanceTimersByTimeAsync(15_000);

    expect(attempt).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
