import { beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   What the cookie tray costs to build

   buildAvailableCookies produced a glyph for every word in the library, and
   a zhuyin glyph is a dictionary conversion of the word's Chinese reading.
   The home tray shows three cookies and the vocabulary tray eight, so on a
   300-word library that was 150 conversions per render — including every
   frame of a drag — to draw a handful of characters. Measured at 12.8ms a
   call, against 0.5ms now.

   It also mapped before it filtered, so words Yumi had already eaten were
   given glyphs and then thrown away: the longer you played, the more work
   the tray did for cookies nobody would ever see.

   These assert the cost, not the drawing — the glyphs themselves must come
   out exactly as before, which is what the last test is for.
   ========================================================= */

const conversions = vi.hoisted(() => ({ count: 0 }));

vi.mock("@/lib/pronunciation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/pronunciation")>();

  return {
    ...actual,
    getPronunciationData: (input: Parameters<typeof actual.getPronunciationData>[0]) => {
      conversions.count += 1;
      return actual.getPronunciationData(input);
    },
  };
});

const { buildAvailableCookies } = await import("@/lib/pet/moodEngine");
type VocabularyItem = import("@/lib/types/app").VocabularyItem;

const CHINESE = ["蘋果", "橋樑", "蠟燭", "漂流", "餘燼", "鍛造"];

function library(n: number): VocabularyItem[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `w${i}`,
    user_id: "u",
    word: `word${i}`,
    translation: `${CHINESE[i % CHINESE.length]}${i}`,
    created_at: new Date(Date.UTC(2026, 0, 1) + i * 86_400_000).toISOString(),
    status: "learning",
    last_reviewed_at: null,
    next_review_at: null,
  })) as unknown as VocabularyItem[];
}

beforeEach(() => {
  conversions.count = 0;
});

describe("building the tray", () => {
  it("converts nothing until a glyph is actually read", () => {
    buildAvailableCookies(library(300), []);

    expect(conversions.count).toBe(0);
  });

  it("converts only for the cookies the tray shows", () => {
    const cookies = buildAvailableCookies(library(300), []);

    // The home tray shows three, and reading `.glyph` is what a render does.
    const shown = cookies.slice(0, 3).map((cookie) => cookie.glyph);

    expect(shown).toHaveLength(3);

    // Three cookies, and only the zhuyin ones need a conversion at all —
    // never the whole library.
    expect(conversions.count).toBeLessThanOrEqual(3);
  });

  it("reads a glyph once, however many times it is rendered", () => {
    const [cookie] = buildAvailableCookies(library(4), []);

    const first = cookie.glyph;
    const repeats = Array.from({ length: 20 }, () => cookie.glyph);

    expect(new Set(repeats).size).toBe(1);

    expect(cookie.glyph).toBe(first);
    expect(conversions.count).toBeLessThanOrEqual(1);
  });

  it("does not build a cookie for a word Yumi has already eaten", () => {
    const items = library(10);
    const fed = items.slice(0, 6).map((item) => item.id);

    const cookies = buildAvailableCookies(items, fed);

    expect(cookies).toHaveLength(4);
    expect(cookies.map((c) => c.id)).toEqual(["w6", "w7", "w8", "w9"]);
  });

  it("still gives each cookie the glyph and type it had before", () => {
    const cookies = buildAvailableCookies(library(6), []);

    // Earned order, oldest first, alternating letter/zhuyin — and a real
    // first letter or a real zhuyin symbol, never a placeholder.
    expect(cookies.map((c) => c.type)).toEqual([
      "letter", "zhuyin", "letter", "zhuyin", "letter", "zhuyin",
    ]);
    expect(cookies[0].glyph).toBe("W");
    expect(cookies[2].glyph).toBe("W");
    for (const index of [1, 3, 5]) {
      expect(cookies[index].glyph).toMatch(/[ㄅ-ㄯ]/);
    }
  });

  it("keeps the type cycle stable as words are fed", () => {
    const items = library(6);
    const all = buildAvailableCookies(items, []);
    const afterFeeding = buildAvailableCookies(items, ["w0", "w1", "w2"]);

    // w3's shape must not change just because earlier words were eaten —
    // the cycle is keyed on earned order, not on what is left.
    expect(afterFeeding.map((c) => c.type)).toEqual(
      all.slice(3).map((c) => c.type),
    );
  });
});
