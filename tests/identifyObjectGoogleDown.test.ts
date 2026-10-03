import { beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   "Google is down" — said at once, and free (Chi, 2026-09-28)

   When every vision model is already known to be away, the camera route
   answers straight away with code "google_down" and when Google is likely
   back — before the reader's daily allowance is touched and before any
   model is asked.
   ========================================================= */

const mocks = vi.hoisted(() => ({
  visionOutage: vi.fn(),
  identifyObject: vi.fn(),
  consumeDailyQuota: vi.fn(async () => true),
  refundDailyQuota: vi.fn(async () => undefined),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "reader-1" } } }) },
  }),
}));

vi.mock("@/lib/profile/languagePair", () => ({
  readLearningPair: async () => ["fr", "zh-TW"],
}));

vi.mock("@/lib/ai/dailyQuota", () => ({
  consumeDailyQuota: mocks.consumeDailyQuota,
  refundDailyQuota: mocks.refundDailyQuota,
}));

vi.mock("@/lib/ai/identifyObject", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/identifyObject")>();
  return {
    ...actual,
    getCachedObjectIdentification: () => null,
    identifyObject: mocks.identifyObject,
    visionOutage: mocks.visionOutage,
  };
});

const { POST } = await import("@/app/api/identify-object/route");
const { ObjectIdentificationUnavailableError } = await import(
  "@/lib/ai/identifyObject"
);

function request() {
  return {
    json: async () => ({ image: "data:image/jpeg;base64,cGhvdG8=" }),
  } as Request;
}

beforeEach(() => {
  mocks.visionOutage.mockReset().mockResolvedValue(null);
  mocks.identifyObject.mockReset();
  mocks.consumeDailyQuota.mockClear();
  mocks.refundDailyQuota.mockClear();
});

describe("the camera route when Google is down", () => {
  it("says so at once, without spending the reader's allowance or asking a model", async () => {
    mocks.visionOutage.mockResolvedValue({ until: 1_790_000_000_000, quotaOnly: false });

    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "google_down",
      retryAt: 1_790_000_000_000,
      quotaOnly: false,
    });
    expect(mocks.consumeDailyQuota).not.toHaveBeenCalled();
    expect(mocks.identifyObject).not.toHaveBeenCalled();
  });

  it("says so after asking, and hands the allowance back", async () => {
    mocks.identifyObject.mockRejectedValue(
      new ObjectIdentificationUnavailableError({ until: 42, quotaOnly: true }),
    );

    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "google_down",
      retryAt: 42,
      quotaOnly: true,
    });
    expect(mocks.refundDailyQuota).toHaveBeenCalledTimes(1);
  });
});

describe("the camera's answer", () => {
  it("carries the built-in dictionary's IPA over the model's, for a word it knows", async () => {
    mocks.identifyObject.mockResolvedValue({
      term: "chaise",
      termLanguage: "fr",
      termIpa: "/ʃɛːz/",
      translation: "椅子",
      translationLanguage: "zh-TW",
      partOfSpeech: "noun",
      termExample: "",
      translationExample: "",
      confidence: "high",
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ term: "chaise", termIpa: "/ʃɛz/" });
  });
});
