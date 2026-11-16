import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchWithClockSkewRetry } from "@/lib/supabase/service";

/*
 * On 2026-11-15 at 22:00 UTC the news catch-up failed with "JWT issued at
 * future": Supabase's gateway stamped the token a moment ahead of the
 * database's clock. The service client now sends such a request again, at
 * most twice, and passes every other answer through untouched.
 */

const skew = () => new Response('{"code":"PGRST303","message":"JWT issued at future"}', { status: 401 });
const ok = () => Response.json([{ id: 1 }]);
const noWait = async () => {};

afterEach(() => vi.unstubAllGlobals());

describe("the service client's fetch", () => {
  it("asks again after a clock-skew refusal, and returns the answer that follows", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(skew()).mockResolvedValueOnce(ok());
    vi.stubGlobal("fetch", fetch);
    const response = await fetchWithClockSkewRetry("https://example.supabase.co/rest/v1/daily_news_items", { method: "GET" }, noWait);
    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1]).toEqual(fetch.mock.calls[0]);
  });

  it("asks at most twice more, then returns the refusal", async () => {
    const fetch = vi.fn().mockImplementation(async () => skew());
    vi.stubGlobal("fetch", fetch);
    const response = await fetchWithClockSkewRetry("https://example.supabase.co/rest/v1/x", undefined, noWait);
    expect(response.status).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("leaves any other refusal, and any success, alone", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('{"message":"Invalid API key"}', { status: 401 })).mockResolvedValueOnce(ok());
    vi.stubGlobal("fetch", fetch);
    expect((await fetchWithClockSkewRetry("https://example.supabase.co/a", undefined, noWait)).status).toBe(401);
    expect((await fetchWithClockSkewRetry("https://example.supabase.co/b", undefined, noWait)).status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
