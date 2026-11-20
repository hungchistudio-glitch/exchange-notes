import { describe, expect, it } from "vitest";

import {
  HANGUL_COMPOUND_VOWELS,
  HANGUL_CONSONANTS,
  HANGUL_TENSE,
  HANGUL_VOWELS,
  KANA_BASIC,
  KANA_COMBINED,
  KANA_VOICED,
  syllableOf,
  toKatakana,
} from "@/lib/pronunciation/alphabets";
import { listPronunciationPacks, moduleHasContent } from "@/lib/pronunciation/lab/registry";

/* The Lab's kana and Hangul charts (2026-11-16): every letter, once. */
const cells = (rows: typeof KANA_BASIC) => rows.flatMap((row) => row.cells).filter((cell) => cell !== null);

describe("the kana chart", () => {
  it("has the 46 basic kana, 25 voiced and 33 combined", () => {
    expect(cells(KANA_BASIC)).toHaveLength(46);
    expect(cells(KANA_VOICED)).toHaveLength(25);
    expect(cells(KANA_COMBINED)).toHaveLength(33);
  });

  it("writes each in katakana and in the card's romaji", () => {
    const all = cells([...KANA_BASIC, ...KANA_VOICED, ...KANA_COMBINED]);
    expect(new Set(all.map((cell) => cell.hiragana)).size).toBe(all.length);
    expect(all.find((cell) => cell.hiragana === "し")).toEqual({ hiragana: "し", katakana: "シ", romaji: "shi" });
    expect(all.find((cell) => cell.hiragana === "きゃ")).toEqual({ hiragana: "きゃ", katakana: "キャ", romaji: "kya" });
    expect(toKatakana("を")).toBe("ヲ");
    for (const cell of all) expect(cell.romaji).toMatch(/^[a-z]+$/);
  });
});

describe("the Hangul chart", () => {
  it("has 19 consonants and 21 vowels, each once", () => {
    const consonants = [...HANGUL_CONSONANTS, ...HANGUL_TENSE];
    const vowels = [...HANGUL_VOWELS, ...HANGUL_COMPOUND_VOWELS];
    expect(new Set(consonants.map((letter) => letter.letter)).size).toBe(19);
    expect(new Set(vowels.map((letter) => letter.letter)).size).toBe(21);
  });

  it("names a vowel by its syllable and composes the grid", () => {
    expect(HANGUL_VOWELS[0]).toMatchObject({ letter: "ㅏ", name: "아" });
    expect(syllableOf("ㄱ", "ㅏ")).toBe("가");
    expect(syllableOf("ㅎ", "ㅣ")).toBe("히");
    expect(syllableOf("ㄲ", "ㅢ")).toBe("끠");
    expect(syllableOf("x", "ㅏ")).toBe("");
  });
});

describe("where the chart appears", () => {
  it("only for Japanese and Korean", () => {
    const shown = listPronunciationPacks()
      .filter((pack) => moduleHasContent(pack, "alphabet"))
      .map((pack) => pack.language);
    expect(shown).toEqual(["ja", "ko"]);
  });
});
