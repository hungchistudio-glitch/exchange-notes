import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { firstAnswer } from "@/lib/ai/hedge";
import { awayFor, healthyModels, markModelAway, nextPacificMidnight, resetModelHealthForTests } from "@/lib/ai/modelHealth";

/* =========================================================
   Not paying for a hang twice, or at all

   On 2026-09-27 a French lookup waited 13.5s for gemini-3.6-flash to answer
   DEADLINE_EXCEEDED before the next model was asked, and that one answered
   in a second. These are about the two things that stop that: asking the
   next model alongside a slow one, and remembering which models to skip.
   ========================================================= */

const options = (now: number) => ({
  hedgeAfterMs: 4_000,
  deadline: now + 20_000,
  minAttemptMs: 4_000,
  maxAttemptMs: 14_000,
});

function hangs(): Promise<string> {
  return new Promise(() => undefined);
}

describe("asking a second model before the first gives up", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("asks the next model after the hedge delay, and takes whichever answers", async () => {
    const asked: string[] = [];
    const answer = firstAnswer(
      ["slow", "quick"],
      (model) => {
        asked.push(model);
        return model === "slow"
          ? hangs()
          : new Promise((resolve) => setTimeout(() => resolve("salut"), 1_000));
      },
      options(Date.now()),
    );

    await vi.advanceTimersByTimeAsync(3_999);
    expect(asked).toEqual(["slow"]);

    await vi.advanceTimersByTimeAsync(1_001);
    expect(asked).toEqual(["slow", "quick"]);

    await vi.advanceTimersByTimeAsync(1_000);
    await expect(answer).resolves.toEqual({ value: "salut", model: "quick" });
  });

  it("does not spend a second request when the first answers in time", async () => {
    const asked: string[] = [];
    const answer = firstAnswer(
      ["first", "second"],
      (model) => {
        asked.push(model);
        return new Promise((resolve) => setTimeout(() => resolve(model), 1_044));
      },
      options(Date.now()),
    );

    await vi.advanceTimersByTimeAsync(10_000);
    await expect(answer).resolves.toEqual({ value: "first", model: "first" });
    expect(asked).toEqual(["first"]);
  });

  it("moves on at once when a model refuses, and reports the refusal", async () => {
    const failures: string[] = [];
    const answer = firstAnswer(
      ["refuses", "answers"],
      (model) =>
        model === "refuses"
          ? Promise.reject(new Error("429"))
          : Promise.resolve("ok"),
      options(Date.now()),
      (model) => failures.push(model),
    );

    await vi.advanceTimersByTimeAsync(0);
    await expect(answer).resolves.toEqual({ value: "ok", model: "answers" });
    expect(failures).toEqual(["refuses"]);
  });

  it("stops the slower attempt once another has answered, and does not call that a failure", async () => {
    const failures: string[] = [];
    let slowSignal: AbortSignal | null = null;

    const answer = firstAnswer(
      ["slow", "quick"],
      (model, _timeout, signal) => {
        if (model === "quick") return Promise.resolve("ok");
        slowSignal = signal;
        return new Promise((_, reject) =>
          signal.addEventListener("abort", () => reject(new Error("aborted"))),
        );
      },
      options(Date.now()),
      (model) => failures.push(model),
    );

    await vi.advanceTimersByTimeAsync(4_000);
    await expect(answer).resolves.toEqual({ value: "ok", model: "quick" });
    expect(slowSignal!.aborted).toBe(true);
    expect(failures).toEqual([]);
  });

  it("gives up with null when every model fails", async () => {
    const answer = firstAnswer(
      ["a", "b"],
      () => Promise.reject(new Error("503")),
      options(Date.now()),
    );

    await vi.advanceTimersByTimeAsync(0);
    await expect(answer).resolves.toBeNull();
  });
});

describe("how long a model is put away", () => {
  it("keeps a daily-quota refusal away until midnight Pacific", () => {
    // 2026-09-27 15:03 UTC is 08:03 in Los Angeles (PDT, UTC-7).
    const now = Date.UTC(2026, 8, 27, 15, 3, 0);
    const midnight = Date.UTC(2026, 8, 28, 7, 0, 0);

    expect(nextPacificMidnight(now)).toBe(midnight);

    const verdict = awayFor(
      {
        rateLimited: true,
        timedOut: false,
        message:
          "Quota exceeded for metric: generate_content_free_tier_requests, quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier, limit: 20",
      },
      19_000,
      now,
    );

    expect(verdict).toEqual({ until: midnight, reason: "daily_quota" });
  });

  it("keeps a per-minute refusal away only as long as it asked", () => {
    const now = 1_000_000;
    expect(
      awayFor({ rateLimited: true, timedOut: false, message: "retry in 18s" }, 19_000, now),
    ).toEqual({ until: now + 19_000, reason: "rate_limit" });
  });

  it("keeps a hang away for five minutes, and a plain refusal not at all", () => {
    const now = 1_000_000;
    expect(awayFor({ rateLimited: false, timedOut: true, message: "" }, 0, now)).toEqual({
      until: now + 5 * 60 * 1000,
      reason: "timeout",
    });
    expect(awayFor({ rateLimited: false, timedOut: false, message: "503" }, 0, now)).toBeNull();
  });
});

describe("choosing whom to ask", () => {
  beforeEach(() => resetModelHealthForTests());

  it("skips a model this instance has put away", async () => {
    await healthyModels(["a", "b"]); // prime the cache
    await markModelAway("a", { until: Date.now() + 60_000, reason: "timeout" });

    expect(await healthyModels(["a", "b"])).toEqual(["b"]);
  });

  it("never takes the last model away", async () => {
    await healthyModels(["a"]);
    await markModelAway("a", { until: Date.now() + 60_000, reason: "timeout" });

    expect(await healthyModels(["a"])).toEqual(["a"]);
  });
});
