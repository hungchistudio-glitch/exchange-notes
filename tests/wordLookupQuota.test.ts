import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ consume: vi.fn(), refund: vi.fn(), shared: vi.fn(), model: vi.fn(), offline: vi.fn() }));
vi.mock("@/lib/ai/dailyQuota", () => ({ consumeDailyQuota: mocks.consume, refundDailyQuota: mocks.refund }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "reader" } } }) } }) }));
vi.mock("@/lib/profile/languagePair", () => ({ readLanguageRoles: async () => ({ learning: "en", support: "zh-TW", native: "zh-TW" }) }));
vi.mock("@/lib/vocabulary/sharedLookupCache", () => ({ readSharedLookupCache: mocks.shared, writeSharedLookupCache: vi.fn() }));
vi.mock("@/lib/ai/hedge", () => ({ CORE_MAX_ATTEMPTS: 1, firstAnswer: mocks.model }));
vi.mock("@/lib/ai/modelHealth", () => ({ healthyModels: async () => ["mock"], dailyQuotaResetAt: async () => null }));
vi.mock("@/lib/ai/callLog", () => ({ recordAiFailure: vi.fn() }));
vi.mock("@/lib/pronunciation/ipaSource", () => ({ rememberIpa: vi.fn() }));
vi.mock("@/lib/vocabulary/offlineLookup", () => ({ lookupOffline: mocks.offline }));
vi.mock("next/server", async original => ({ ...await original<typeof import("next/server")>(), after: (fn: () => unknown) => void fn() }));
import { POST } from "@/app/api/classify-text/route";
const entry = { term: "example", translation: "例子", termLanguage: "en", translationLanguage: "zh-TW", termExample: "", translationExample: "", partOfSpeech: "noun", category: "other", confidence: "high" };
const lookup = (text: string) => POST(new Request("https://example.test", { method: "POST", body: JSON.stringify({ text }) }));
beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "test-only");
  mocks.consume.mockReset().mockResolvedValue(true);
  mocks.refund.mockReset().mockResolvedValue(undefined);
  mocks.shared.mockReset().mockResolvedValue(null);
  mocks.model.mockReset().mockResolvedValue({ model: "mock", value: entry });
  mocks.offline.mockReset().mockResolvedValue(entry);
});
it("charges one successful model lookup against the user's 150 and caches the answer", async () => {
  await lookup("quota success");
  await lookup("quota success");
  expect(mocks.consume).toHaveBeenCalledExactlyOnceWith("reader", "word_lookup", 150);
  expect(mocks.model).toHaveBeenCalledTimes(1);
  expect(mocks.refund).not.toHaveBeenCalled();
});
it("serves a shared cache hit without charging or contacting Gemini", async () => {
  mocks.shared.mockResolvedValue(entry);
  await lookup("quota shared");
  expect(mocks.consume).not.toHaveBeenCalled();
  expect(mocks.model).not.toHaveBeenCalled();
});
it("keeps dictionary answers available after the daily allowance", async () => {
  mocks.consume.mockResolvedValue(false);
  const response = await lookup("quota denied");
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ term: "example", dailyLimitReached: true, degraded: true, retryAfterMs: null });
  expect(mocks.model).not.toHaveBeenCalled();
  expect(mocks.offline).toHaveBeenCalledTimes(1);
});
it("refunds a failed model lookup answered by the dictionary", async () => {
  mocks.model.mockResolvedValue(null);
  const response = await lookup("quota fallback");
  expect((await response.json()).degraded).toBe(true);
  expect(mocks.refund).toHaveBeenCalledExactlyOnceWith("reader", "word_lookup");
});
