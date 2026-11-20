import { describe, expect, it, vi } from "vitest";

import { japaneseSimilarity } from "@/lib/pronunciation/lab/analyzer";
import { cjkSansFor, cjkScriptOf, cjkSerifFor } from "@/lib/fonts/cjkFaces";

/* =========================================================
   Japanese is compared by sound, not by spelling

   A recogniser writes what it hears the way a newspaper would: say あさ and
   it returns 朝. The Lab's targets are mostly kana, so a letter-by-letter
   comparison marked every correct answer wrong (2026-11-16). Both sides are
   brought to hiragana first; when a reading cannot be had, the attempt is
   left unmeasured rather than called wrong.
   ========================================================= */

const readings: Record<string, string> = { 朝: "あさ", 箸: "はし", 橋: "はし", 雨: "あめ" };
const lookup = vi.fn(async (text: string) => readings[text] ?? null);

describe("japaneseSimilarity", () => {
  it("scores a kanji transcript of a kana target by its reading", async () => {
    await expect(japaneseSimilarity("朝", "あさ", lookup)).resolves.toBe(1);
  });

  it("treats katakana and hiragana as the same sounds", async () => {
    await expect(japaneseSimilarity("アサ", "あさ", lookup)).resolves.toBe(1);
  });

  it("still tells a different word apart", async () => {
    const similarity = await japaneseSimilarity("雨", "あさ", lookup);
    expect(similarity).not.toBeNull();
    expect(similarity!).toBeLessThan(0.65);
  });

  it("matches identical kanji without asking for a reading", async () => {
    lookup.mockClear();
    await expect(japaneseSimilarity("箸", "箸", lookup)).resolves.toBe(1);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("compares two kanji spellings by sound", async () => {
    // 箸 and 橋 are both はし: the recogniser cannot hear pitch, and neither can this.
    await expect(japaneseSimilarity("橋", "箸", lookup)).resolves.toBe(1);
  });

  it("leaves the attempt unmeasured when no reading comes", async () => {
    await expect(japaneseSimilarity("未知", "あさ", lookup)).resolves.toBeNull();
  });
});

/* Canvas and image text can't follow `[lang]`: the script picks the faces. */
describe("cjkFaces", () => {
  it("tells the three scripts apart", () => {
    expect(cjkScriptOf("도서관")).toBe("ko");
    expect(cjkScriptOf("としょかん")).toBe("ja");
    expect(cjkScriptOf("圖書館")).toBe("zh");
    expect(cjkScriptOf("図書館", "ja")).toBe("ja");
  });

  it("lists the script's own faces before anyone else's", () => {
    expect(cjkSansFor("도서관").indexOf("KR")).toBeLessThan(cjkSansFor("도서관").indexOf("TC"));
    expect(cjkSerifFor("あさ").indexOf("JP")).toBeLessThan(cjkSerifFor("あさ").indexOf("TC"));
  });
});
