import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeDailyQuota: vi.fn(),
  aiConstructor: vi.fn(),
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
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation((...args: unknown[]) => {
    mocks.aiConstructor(...args);
    return { interactions: { create: vi.fn() } };
  }),
}));

import { POST } from "@/app/api/voice-lookup/route";

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-key";
  mocks.consumeDailyQuota.mockReset().mockResolvedValue(false);
  mocks.aiConstructor.mockReset();
});

describe("voice lookup quota", () => {
  it("does not create a model client after the daily allowance is spent", async () => {
    const form = new FormData();
    form.append("audio", new Blob(["audio"], { type: "audio/webm" }), "speech.webm");

    const response = await POST({
      formData: async () => form,
    } as Request);

    expect(response.status).toBe(429);
    expect(mocks.consumeDailyQuota).toHaveBeenCalledWith(
      "reader-1",
      "voice_lookup",
      20,
    );
    expect(mocks.aiConstructor).not.toHaveBeenCalled();
  });
});
