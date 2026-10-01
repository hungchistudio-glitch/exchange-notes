import { describe, expect, it } from "vitest";

import { getErrorStatus } from "@/lib/ai/modelRequest";

/* =========================================================
   A 503 that arrives through the SDK's retry wrapper is still a 503

   2026-09-30: two menu scans met Google's "high demand" and the app logged
   them with no status — the SDK, given retryOptions, reports a failure as
   Error("Retryable HTTP Error: Service Unavailable"). Unrecognised, it was
   neither marked busy nor told to the reader as Google being down.
   ========================================================= */

describe("getErrorStatus", () => {
  it("reads the status the SDK's retry wrapper only names", () => {
    expect(getErrorStatus(new Error("Retryable HTTP Error: Service Unavailable"))).toBe(503);
    expect(getErrorStatus(new Error("Retryable HTTP Error: Too Many Requests"))).toBe(429);
    expect(getErrorStatus(new Error("Retryable HTTP Error: Gateway Timeout"))).toBe(504);
  });

  it("still prefers a numeric status when there is one", () => {
    expect(getErrorStatus(Object.assign(new Error("x"), { status: 500 }))).toBe(500);
  });

  it("knows nothing about an ordinary error", () => {
    expect(getErrorStatus(new Error("boom"))).toBeNull();
  });
});
