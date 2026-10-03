import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

/* =========================================================
   A cookie wears the start of its word (Chi, 2026-10-03: "確定每個餅乾
   icon letter 跟單字是相關的開頭，目前並不是如此")

   Every Chinese cookie on the floating home wore ㄅ — the placeholder for a
   reading the field never asked for — and a cookie could take its letter
   from a gloss the word card no longer shows.
   ========================================================= */

const readings = vi.hoisted(() => ({
  zhuyin: { "蘋果": "ㄆㄧㄥˊ ㄍㄨㄛˇ", "橋樑": "ㄑㄧㄠˊ ㄌㄧㄤˊ", "T恤": "T ㄒㄩˋ" } as Record<string, string>,
}));

vi.mock("@/hooks/i18n/useTranslation", async () => {
  const english = (await import("@/lib/i18n/en")).default;
  return { default: () => ({ language: "english", t: english }) };
});
vi.mock("@/hooks/useDisplayLanguages", () => ({ default: () => ({ learningLanguage: "en", supportLanguage: "zh-TW" }) }));
vi.mock("@/hooks/usePhonetics", () => ({
  default: () => (entry: { text: string; language: string }) =>
    entry.language === "zh-TW" && readings.zhuyin[entry.text] ? { zhuyin: readings.zhuyin[entry.text] } : undefined,
}));

import FloatingCookieField from "@/components/home/yumi/FloatingCookieField";
import { buildAvailableCookies, cookieGlyph } from "@/lib/pet/moodEngine";
import type { VocabularyItem } from "@/lib/types/app";

function word(
  id: string,
  text: string,
  gloss: string,
  extra: Partial<VocabularyItem> = {},
): VocabularyItem {
  return {
    id, user_id: "u", word: text, translation: gloss,
    word_language: "en", translation_language: "zh-TW",
    texts: { en: text, "zh-TW": gloss }, examples: {},
    created_at: `2026-10-0${id.length}T00:00:00Z`,
    status: "learning", last_reviewed_at: null, next_review_at: null,
    ...extra,
  } as unknown as VocabularyItem;
}

describe("the letter", () => {
  it("is the word's first letter, past any opening punctuation", () => {
    const cookies = buildAvailableCookies([
      word("a", "¿Qué tal?", "你好", { word_language: "es", texts: { es: "¿Qué tal?", "zh-TW": "你好" } }),
      word("bb", "x", "y"),
      word("ccc", "l'eau", "水", { word_language: "fr", texts: { fr: "l'eau", "zh-TW": "水" } }),
      word("dddd", "x", "y"),
      word("eeeee", "éclair", "閃電泡芙", { word_language: "fr", texts: { fr: "éclair", "zh-TW": "閃電泡芙" } }),
    ], []);
    expect(cookies[0].glyph).toBe("Q");
    expect(cookies[2].glyph).toBe("L");
    expect(cookies[4].glyph).toBe("É");
  });
});

describe("the zhuyin", () => {
  it("is the first symbol of the Chinese word's reading, and its first character until then", () => {
    const [, apple] = buildAvailableCookies([word("a", "bridge", "橋樑"), word("bb", "apple", "蘋果")], []);
    expect(apple.type).toBe("zhuyin");
    expect(apple.glyph).toBe("蘋");
    expect(cookieGlyph(apple, null)).toBe("蘋");
    expect(cookieGlyph(apple, "ㄆㄧㄥˊ ㄍㄨㄛˇ")).toBe("ㄆ");
    expect(cookieGlyph(apple, "˙ㄉㄜ")).toBe("ㄉ");
  });

  it("is never ㄅ for a word that does not start with ㄅ", () => {
    const [, shirt] = buildAvailableCookies([word("a", "x", "y"), word("bb", "T-shirt", "T恤")], []);
    expect(shirt.glyph).toBe("T");
    expect(cookieGlyph(shirt, "T ㄒㄩˋ")).toBe("T");
  });

  it("comes from a side the word card shows", () => {
    // Saved English → Chinese, read today with Spanish glosses: the card
    // shows "apple / manzana", so no cookie may wear the Chinese reading.
    const items = [
      word("a", "bridge", "橋樑", { texts: { en: "bridge", "zh-TW": "橋樑", es: "puente" } }),
      word("bb", "apple", "蘋果", { texts: { en: "apple", "zh-TW": "蘋果", es: "manzana" } }),
    ];
    const cookies = buildAvailableCookies(items, [], { learningLanguage: "en", supportLanguage: "es" });
    expect(cookies.map(cookie => cookie.type)).toEqual(["letter", "letter"]);
    expect(cookies.map(cookie => cookie.glyph)).toEqual(["B", "A"]);
  });
});

describe("the floating home", () => {
  it("shows each Chinese cookie's real reading, not a placeholder", () => {
    const items = [word("a", "bridge", "橋樑"), word("bb", "apple", "蘋果"), word("ccc", "candle", "蠟燭")];
    const stageRef = createRef<HTMLDivElement>();
    const cookies = buildAvailableCookies(items, [], { learningLanguage: "en", supportLanguage: "zh-TW" });
    render(
      <div ref={stageRef} data-yumi-mode="rest">
        <FloatingCookieField stageRef={stageRef} cookies={cookies} items={items} onFeed={vi.fn()} />
      </div>,
    );
    const faces = [...document.querySelectorAll("[data-floating-cookie] > span[aria-hidden]")].map(face => face.textContent);
    // bridge → B, apple → ㄆ (its reading), candle → C.
    expect(faces).toEqual(["B", "ㄆ", "C"]);
    expect(faces).not.toContain("ㄅ");
  });
});
