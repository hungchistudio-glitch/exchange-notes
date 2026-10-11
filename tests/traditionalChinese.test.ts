import { beforeEach, describe, expect, it, vi } from "vitest";

import { tidyChinese, tidyChineseDeep } from "@/lib/chinese/tidyChinese";
import { toTraditional } from "@/lib/chinese/toTraditional";
import { normalizeQuery } from "@/lib/lexicon/normalize";
import { classifyQueryKind } from "@/lib/lexicon/queryKind";

/* =========================================================
   Only Traditional Chinese (Chi, 2026-10-11: "只能有繁體中文")

   A spoken question came back from the transcriber as
   跳 字 停 的 时 候 应 该 怎 么 办 ?, and was looked up, cached and shown
   that way: Simplified, one character at a time, with an ASCII question
   mark. Yumi's readings meanwhile came back in English, because the server
   could not read the display language and fell back to its default.
   ========================================================= */

describe("Chinese as the app writes it", () => {
  it("turns a transcriber's spaced Simplified into a Traditional sentence", () => {
    expect(tidyChinese("跳 字 停 的 时 候 应 该 怎 么 办 ?")).toBe("跳字停的時候應該怎麼辦？");
  });

  it("keeps Chinese punctuation through the query normaliser", () => {
    // NFKC alone folds ，？ to ,? — which is how 看到他之後,我又看到你。 was stored.
    expect(normalizeQuery("看到他之後，我又看到你。")).toBe("看到他之後，我又看到你。");
    expect(normalizeQuery("你應該怎麼辦？")).toBe("你應該怎麼辦？");
    expect(normalizeQuery("我想想…")).toBe("我想想……");
  });

  it("converts Simplified a reader typed or a recogniser wrote", () => {
    expect(normalizeQuery("我老婆今天肚子疼, 怎么办")).toBe("我老婆今天肚子疼，怎麼辦");
  });

  it("leaves characters that are already correct Traditional alone", () => {
    expect(tidyChinese("只有一面")).toBe("只有一面");
  });

  it("leaves everything that is not Chinese untouched", () => {
    expect(normalizeQuery("Could you pass the salt?")).toBe("Could you pass the salt?");
    expect(normalizeQuery("It costs 3.5 euros, right?")).toBe("It costs 3.5 euros, right?");
    expect(normalizeQuery("我在用 iPhone 拍照")).toBe("我在用 iPhone 拍照");
  });

  it("still reads a spoken Chinese sentence as a sentence", () => {
    expect(classifyQueryKind("跳 字 停 的 时 候 应 该 怎 么 办 ?")).toBe("sentence");
  });

  it("reaches every string in a model's answer", () => {
    expect(
      tidyChineseDeep({
        term: "What should I do?",
        translation: "应该怎么办？",
        insight: { gist: "这是在求助。", phrases: [{ phrase: "怎么办", note: "问办法" }] },
        confidence: "high",
      }),
    ).toEqual({
      term: "What should I do?",
      translation: "應該怎麼辦？",
      insight: { gist: "這是在求助。", phrases: [{ phrase: "怎麼辦", note: "問辦法" }] },
      confidence: "high",
    });
  });
});

describe("the characters the table could not decide alone", () => {
  it.each([
    ["怎么办", "怎麼辦"],
    ["以后再说", "以後再說"],
    ["这里和那里", "這裡和那裡"],
    ["我听不懂", "我聽不懂"],
    ["根据价格", "根據價格"],
    ["几点了", "幾點了"],
    ["头发很长", "頭髮很長"],
    ["没关系", "沒關係"],
    ["一只猫", "一隻貓"],
    ["你必须走", "你必須走"],
    ["好脏", "好髒"],
    ["吃面条", "吃麵條"],
    ["不准确", "不準確"],
    ["复杂", "複雜"],
    ["干净", "乾淨"],
    ["你在干什么", "你在幹什麼"],
    ["周末去旅游", "週末去旅遊"],
  ])("%s → %s", (simplified, traditional) => {
    expect(toTraditional(simplified)).toBe(traditional);
  });

  it.each([
    "皇后", "三公里", "萬里長城", "茶几", "拮据", "不准進來", "只有一面", "這只是開始",
    "胡須", "心臟", "後來", "頭髮", "麵包", "沒關係",
  ])("leaves %s as it is", (traditional) => {
    expect(toTraditional(traditional)).toBe(traditional);
  });

  it("keeps a queen and a mile in Simplified text too", () => {
    expect(toTraditional("皇后走了三公里")).toBe("皇后走了三公里");
    expect(toTraditional("胡须")).toBe("鬍鬚");
    expect(toTraditional("心脏")).toBe("心臟");
  });
});

/* ---------- The lookup route ---------- */

const mocks = vi.hoisted(() => ({ shared: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "reader-1" } } }) },
  }),
}));
vi.mock("@/lib/profile/languagePair", () => ({
  readLanguageRoles: async () => ({ learning: "en", support: "zh-TW", native: "zh-TW" }),
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

function lookup(body: Record<string, unknown>) {
  return POST(
    new Request("https://exchange.test/api/classify-text", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  mocks.shared.mockReset().mockResolvedValue(null);
  vi.stubEnv("GEMINI_API_KEY", "");
});

describe("the lookup route", () => {
  it("answers in Traditional even when the cached answer is Simplified", async () => {
    mocks.shared.mockResolvedValue({
      kind: "sentence",
      term: "What should I do?",
      termLanguage: "en",
      translation: "我应该怎么办？",
      translationLanguage: "zh-TW",
      partOfSpeech: "phrase",
      termExample: "I lost my passport. What should I do?",
      translationExample: "我的护照不见了，我该怎么办？",
      confidence: "high",
      category: "other",
      insight: {
        language: "zh-TW",
        gist: "这是在请对方给建议。",
        literal: "",
        tone: "",
        implied: "",
        context: "",
        phrases: [],
      },
    });

    const body = await (
      await lookup({ text: "我应该怎么办?", explainLanguage: "zh-TW" })
    ).json();

    expect(body.translation).toBe("我應該怎麼辦？");
    expect(body.translationExample).toBe("我的護照不見了，我該怎麼辦？");
    expect(body.insight.gist).toBe("這是在請對方給建議。");
  });

  it("looks the sentence up in Traditional, in the language the screen is in", async () => {
    // French, not the reader's own Chinese: proof the screen's language is
    // the one used, not a fallback that happens to agree with it.
    await lookup({ text: "以后我们该怎么走?", explainLanguage: "fr" });

    const key = mocks.shared.mock.calls[0][0] as string;
    expect(key).toContain("以後我們該怎麼走？");
    expect(key).toContain("#fr");
  });
});
