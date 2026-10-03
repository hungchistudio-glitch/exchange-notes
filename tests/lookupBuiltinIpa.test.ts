import { beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   A looked-up word's IPA, from the built-in dictionary when it has one
   (Chi, 2026-10-03: "混合來源")

   The lookup asks the model for the headword's IPA in the same request,
   and the card shows whatever comes back. For a word the app's own
   dictionary knows, the checked transcription wins — and an offline answer,
   which has none of its own, gets one.
   ========================================================= */

const mocks = vi.hoisted(() => ({
  shared: vi.fn(),
  generateJson: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "reader-1" } } }) },
  }),
}));
vi.mock("@/lib/profile/languagePair", () => ({
  readLanguageRoles: async () => ({ learning: "fr", support: "zh-TW", native: "zh-TW" }),
}));
vi.mock("@/lib/vocabulary/sharedLookupCache", () => ({
  readSharedLookupCache: mocks.shared,
  writeSharedLookupCache: vi.fn(),
}));
vi.mock("@/lib/ai/callLog", () => ({ recordAiFailure: vi.fn() }));
vi.mock("@/lib/ai/modelHealth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/modelHealth")>()),
  dailyQuotaResetAt: async () => null,
}));
vi.mock("@/lib/pronunciation/ipaSource", () => ({ rememberIpa: vi.fn() }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => unknown) => void task(),
}));

const { POST } = await import("@/app/api/classify-text/route");

function lookup(text: string) {
  return POST(
    new Request("https://exchange.test/api/classify-text", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    }),
  );
}

beforeEach(() => {
  mocks.shared.mockReset().mockResolvedValue(null);
  vi.stubEnv("GEMINI_API_KEY", "");
});

describe("a looked-up word's IPA", () => {
  it("replaces the model's transcription with the dictionary's", async () => {
    mocks.shared.mockResolvedValue({
      term: "bonjour",
      termLanguage: "fr",
      termIpa: "/bɔ̃.ˈʒuʁ/",
      translation: "你好",
      translationLanguage: "zh-TW",
      partOfSpeech: "phrase",
      termExample: "Bonjour, madame.",
      translationExample: "女士，您好。",
      confidence: "high",
      category: "other",
    });

    const body = await (await lookup("bonjour")).json();

    expect(body.term).toBe("bonjour");
    expect(body.termIpa).toBe("/bɔ̃ʒuʁ/");
  });

  it("keeps the model's for a word the dictionary does not have", async () => {
    mocks.shared.mockResolvedValue({
      term: "abasourdi",
      termLanguage: "fr",
      termIpa: "/abazuʁdi/",
      translation: "目瞪口呆",
      translationLanguage: "zh-TW",
      partOfSpeech: "adjective",
      termExample: "",
      translationExample: "",
      confidence: "high",
      category: "other",
    });

    const body = await (await lookup("abasourdi")).json();

    expect(body.termIpa).toBe("/abazuʁdi/");
  });
});
