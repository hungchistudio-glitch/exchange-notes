import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transcribe: vi.fn(),
  consumeDailyQuota: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "reader-1" } } }),
    },
  }),
}));
vi.mock("@/lib/ai/dailyQuota", () => ({
  consumeDailyQuota: mocks.consumeDailyQuota,
  refundDailyQuota: vi.fn(),
}));
vi.mock("@/lib/pronunciation/ipaSource", () => ({
  transcribe: mocks.transcribe,
}));
vi.mock("@/lib/pronunciation", () => ({
  getPhonetics: vi.fn(() => ({})),
}));

import { POST } from "@/app/api/word-pronunciation/route";

function request(body: unknown) {
  return new Request("https://exchange.test/api/word-pronunciation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.consumeDailyQuota.mockReset().mockResolvedValue(true);
  mocks.transcribe.mockReset().mockResolvedValue({
    found: new Map(),
    unavailable: [],
    limited: [],
  });
});

describe("word pronunciation request limits", () => {
  it("rejects an oversized single text before transcription", async () => {
    const response = await POST(
      request({ text: "x".repeat(161), language: "fr" }),
    );

    expect(response.status).toBe(413);
    expect(mocks.transcribe).not.toHaveBeenCalled();
  });

  it("rejects a batch larger than forty items", async () => {
    const response = await POST(
      request({ texts: Array.from({ length: 41 }, () => "bonjour"), language: "fr" }),
    );

    expect(response.status).toBe(400);
    expect(mocks.transcribe).not.toHaveBeenCalled();
  });

  it("returns a real rate-limit response when a cache miss has no quota", async () => {
    mocks.transcribe.mockResolvedValue({
      found: new Map(),
      unavailable: [],
      limited: ["bonjour"],
    });

    const response = await POST(request({ text: "bonjour", language: "fr" }));

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({ code: "daily_limit" });
  });
});
