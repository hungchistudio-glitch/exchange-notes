import { describe, expect, it, vi } from "vitest";

import { __testing } from "@/lib/dailyNews";

/* =========================================================
   The morning's cards stopped being thrown away to a rate limit

   Every batch went at once, and the free tier allows twenty generate
   requests a minute — so six simultaneous calls burst straight through it.
   Production bore it out over seven days: batches 2 and 5 came back 429 most
   mornings, losing a third of the day's cards, and on 5 September every
   batch failed and the reader got "Gemini produced no usable cards for any
   of today's articles".

   The API says how long to wait, in the message — "Please retry in
   5.159426619s" — and nothing read it.
   ========================================================= */

const { runBatches, isRateLimited, retryDelayMs, MAX_CONCURRENT_BATCHES } =
  __testing;

function rateLimit(seconds?: number) {
  return Object.assign(
    new Error(
      seconds === undefined
        ? "429 quota exceeded"
        : `You exceeded your current quota. Please retry in ${seconds}s.`,
    ),
    { status: 429 },
  );
}

describe("recognising a rate limit", () => {
  it("knows one by status", () => {
    expect(isRateLimited(rateLimit())).toBe(true);
  });

  it("knows one by the code the SDK nests", () => {
    expect(isRateLimited({ error: { code: "too_many_requests" } })).toBe(true);
  });

  it("does not mistake an ordinary failure for one", () => {
    expect(isRateLimited(new Error("model produced nothing"))).toBe(false);
    expect(isRateLimited(null)).toBe(false);
  });

  it("waits as long as the API asked, not a guess", () => {
    expect(retryDelayMs(rateLimit(5.159426619))).toBeCloseTo(5409, 0);
  });

  it("falls back when the message says nothing", () => {
    expect(retryDelayMs(rateLimit())).toBe(1500);
  });

  it("will not hold the sixty-second cron open indefinitely", () => {
    expect(retryDelayMs(rateLimit(600))).toBeLessThanOrEqual(12_000);
  });
});

describe("running the batches", () => {
  it("never has more than the limit in flight at once", async () => {
    let inFlight = 0;
    let peak = 0;

    await runBatches(Array.from({ length: 6 }, (_, i) => i), async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight -= 1;
      return "ok";
    });

    expect(peak).toBe(MAX_CONCURRENT_BATCHES);
    expect(peak).toBeLessThan(6);
  });

  it("retries a rate-limited batch and keeps its cards", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    let attempts = 0;
    const run = runBatches([1], async () => {
      attempts += 1;
      if (attempts === 1) throw rateLimit(0.5);
      return "cards";
    });

    await vi.advanceTimersByTimeAsync(2000);
    const results = await run;

    expect(attempts).toBe(2);
    expect(results[0]).toEqual({ status: "fulfilled", value: "cards" });

    vi.useRealTimers();
  });

  it("keeps the other batches when one fails for good", async () => {
    const results = await runBatches([1, 2, 3], async (n) => {
      if (n === 2) throw new Error("model produced nothing");
      return `cards-${n}`;
    });

    expect(results.map((r) => r.status)).toEqual([
      "fulfilled",
      "rejected",
      "fulfilled",
    ]);
  });
});
