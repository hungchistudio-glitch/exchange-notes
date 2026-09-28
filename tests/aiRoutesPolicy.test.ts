import { beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   Every route under the same policy (AI overhaul, batch 3, 2026-09-28)

   Chi's audit asked whether the AI system had too many sources. Part of the
   answer was six routes that each walked the whole candidate list on their
   own terms. These pin the two routes readers meet most often after the
   camera: a note translation must fall past a busy model instead of failing
   on it, and a voice lookup must stop asking after three refusals instead of
   spending the whole of a Google-wide 503 on one recording.
   ========================================================= */

const mocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
  refund: vi.fn(async () => undefined),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "reader-1" } } }),
    },
  }),
}));

vi.mock("@/lib/ai/dailyQuota", () => ({
  consumeDailyQuota: async () => true,
  refundDailyQuota: mocks.refund,
}));

vi.mock("@/lib/profile/languagePair", () => ({
  readLearningPair: async () => ["fr", "zh-TW"],
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: mocks.generateContent };
  },
}));

import { CORE_MAX_ATTEMPTS } from "@/lib/ai/hedge";
import { resetModelHealthForTests } from "@/lib/ai/modelHealth";
import { POST as translateNote } from "@/app/api/translate-note/route";
import { POST as voiceLookup } from "@/app/api/voice-lookup/route";

function busy() {
  return Object.assign(new Error("This model is currently experiencing high demand."), {
    status: 503,
  });
}

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-key";
  mocks.generateContent.mockReset();
  mocks.refund.mockClear();
  resetModelHealthForTests();
});

describe("note translation", () => {
  it("falls past a busy strong model to the next one", async () => {
    const translation = {
      translatedText: "Bonjour",
      detectedLanguage: "zh-TW",
    };
    mocks.generateContent
      .mockRejectedValueOnce(busy())
      .mockResolvedValueOnce({ text: JSON.stringify(translation) });

    const response = await translateNote({
      json: async () => ({ text: "你好" }),
    } as Request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject(translation);
    expect(mocks.generateContent).toHaveBeenCalledTimes(2);

    const [first, second] = mocks.generateContent.mock.calls.map(
      ([request]) => (request as { model: string }).model,
    );
    expect(first).not.toBe(second);
  });
});

describe("voice lookup", () => {
  it(`stops after ${CORE_MAX_ATTEMPTS} refusals and hands the reader's unit back`, async () => {
    mocks.generateContent.mockRejectedValue(busy());

    const form = new FormData();
    form.append("audio", new Blob(["audio"], { type: "audio/webm" }), "speech.webm");

    const response = await voiceLookup({
      formData: async () => form,
    } as Request);

    await expect(response.json()).resolves.toEqual({ heard: false });
    expect(mocks.generateContent).toHaveBeenCalledTimes(CORE_MAX_ATTEMPTS);
    expect(mocks.refund).toHaveBeenCalledTimes(1);
  });
});
