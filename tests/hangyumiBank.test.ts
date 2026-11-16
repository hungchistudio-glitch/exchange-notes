import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { KEYBOARDS, LEVELS, PARTS_OF_SPEECH, isTileLanguage } from "@/lib/hangyumi/rules";
import { LANGUAGE_CODES, type LanguageCode } from "@/lib/languages";

/* =========================================================
   Hangyumi's drafted word bank (supabase/hangyumi/*.json)

   Chi chose a bank written in advance and approved on a review page:
   60 words a level in each of the seven languages (30 until Chi asked
   for more on 2026-10-26; Japanese and Korean from 2026-11-16), every
   one with a clue in all seven that does not give the word away. Every Chinese character
   in it must be Traditional. And no page may import it, or the answers
   would ship to the browser.
   ========================================================= */

const root = join(__dirname, "..");
type Row = [string, string, string, ...string[]];
type BankFile = { language: string; source: string; columns: string[]; words: Row[] };

/*
 * Every language has a bank: Japanese and Korean joined on 2026-11-16,
 * 240 words each, and every word in every bank has a clue in all seven
 * languages and a card side in the other six (Chi: 七種語言補齊).
 */
const BANKED = LANGUAGE_CODES.filter(language =>
  existsSync(join(root, "supabase/hangyumi", `${language}.json`)),
);
const CLUE_LANGUAGES = LANGUAGE_CODES;

/* What a tile may carry, per tile language: Traditional Chinese characters;
   Japanese kanji and kana (and the long-vowel mark); Korean syllable blocks. */
const TILE_SCRIPT: Record<"zh-TW" | "ja" | "ko", RegExp> = {
  "zh-TW": /\p{Script=Han}/u,
  ja: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]/u,
  ko: /\p{Script=Hangul}/u,
};

const bank = Object.fromEntries(BANKED.map(language => [
  language,
  JSON.parse(readFileSync(join(root, "supabase/hangyumi", `${language}.json`), "utf8")) as BankFile,
])) as Record<LanguageCode, BankFile>;

const key = (value: string) => value.normalize("NFC").toLocaleLowerCase();

/* Characters that exist only in Simplified Chinese, and the ones most
   likely to slip into a clue. */
const SIMPLIFIED = "们这说时为国过还样学发经么见对东头长门问间车马鸟爱当会实现进运动电话请让认识书买卖习写读农业应该个开关钱觉听语区难题欢视务观热办体图华广场备岁变权传营节约师乐号产将处圣复无与气";

const SIMPLIFIED_RE = new RegExp(`[${SIMPLIFIED}]`);

describe("the drafted bank", () => {
  it.each(BANKED)("%s has 60 words a level, each once", language => {
    const file = bank[language];
    expect(file.language).toBe(language);
    expect(file.columns.slice(0, 3 + CLUE_LANGUAGES.length)).toEqual(["level", "answer", "partOfSpeech", ...CLUE_LANGUAGES]);
    expect(file.source.length).toBeGreaterThan(10);
    for (const level of LEVELS) {
      expect(file.words.filter(([lvl]) => lvl === level)).toHaveLength(60);
    }
    const keys = file.words.map(([, answer]) => key(answer));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(BANKED)("%s's answers are clean, guessable and of a known part of speech", language => {
    for (const [level, answer, partOfSpeech] of bank[language].words) {
      expect(LEVELS).toContain(level);
      expect(PARTS_OF_SPEECH).toContain(partOfSpeech);
      expect(answer).toBe(answer.normalize("NFC"));
      expect(answer).toBe(answer.trim());
      const letters = [...key(answer)].filter(char => /\p{L}/u.test(char));
      expect(letters.length).toBeGreaterThan(0);
      if (isTileLanguage(language)) {
        for (const char of letters) {
          expect(char, answer).toMatch(TILE_SCRIPT[language]);
          if (language === "zh-TW") expect(SIMPLIFIED, `${answer} is not Traditional`).not.toContain(char);
        }
      } else {
        const keyboard = KEYBOARDS[language as Exclude<typeof language, "zh-TW" | "ja" | "ko">];
        for (const char of letters) {
          expect([...keyboard.letters, ...keyboard.accents], `${answer}: no key for ${char}`).toContain(char);
        }
      }
    }
  });

  it.each(BANKED)("%s's clues are all there, Traditional, and never name the word", language => {
    for (const [, answer, , ...clues] of bank[language].words) {
      expect(clues.length).toBeGreaterThanOrEqual(CLUE_LANGUAGES.length);
      clues.forEach((clue, index) => {
        const clueLanguage = bank[language].columns[3 + index];
        expect(clue.trim().length, `${answer} (${clueLanguage})`).toBeGreaterThan(0);
        expect(key(clue), `${answer} is in its ${clueLanguage} clue`).not.toContain(key(answer));
        if (clueLanguage === "zh-TW") {
          for (const char of clue) expect(SIMPLIFIED, `Simplified ${char} in ${answer}'s clue`).not.toContain(char);
        }
      });
      // A Chinese word's own clue shares none of its characters: each one
      // would be a key handed over.
      if (language === "zh-TW") {
        for (const char of answer) expect(clues[1], answer).not.toContain(char);
      }
      // A Japanese word's own clue shares none of its kanji, for the same
      // reason; its kana are too common to keep out of a sentence.
      if (language === "ja") {
        for (const char of answer) if (/\p{Script=Han}/u.test(char)) expect(clues[5], answer).not.toContain(char);
      }
    }
  });

  it.each(BANKED)("%s has a complete card for every word: its reading, and the word in the other six with theirs", language => {
    const cards = JSON.parse(readFileSync(join(root, "supabase/hangyumi/cards", `${language}.json`), "utf8")) as Record<string, Record<string, unknown>>;
    const text = (value: unknown) => typeof value === "string" && value.trim() !== "";
    const ipa = (value: unknown) => typeof value === "string" && /^\/[^/]+\/$/.test(value);
    const reads = (side: Record<string, unknown>, as: LanguageCode) =>
      as === "zh-TW" ? text(side.pinyin) && text(side.zhuyin)
        : as === "ja" ? typeof side.kana === "string" && /^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u.test(side.kana) && text(side.romaji)
          : as === "ko" ? text(side.rr) && ipa(side.ipa)
            : ipa(side.ipa);
    const gaps: string[] = [];
    for (const [, answer] of bank[language].words) {
      const card = cards[answer];
      if (!card || !reads(card, language)) { gaps.push(`${answer}: reading`); continue; }
      const translations = (card.translations ?? {}) as Record<string, Record<string, unknown>>;
      /* The card's other six sides, each with its own reading. */
      for (const other of CLUE_LANGUAGES.filter(code => code !== language)) {
        const side = translations[other];
        if (!side || typeof side.text !== "string" || !side.text.trim() || !reads(side, other)) gaps.push(`${answer}: ${other}`);
        else if (other === "zh-TW" && SIMPLIFIED_RE.test(side.text)) gaps.push(`${answer}: Simplified ${side.text}`);
      }
    }
    expect(gaps).toEqual([]);
    // Nothing on the card for a word the bank no longer has.
    expect(Object.keys(cards).sort()).toEqual(bank[language].words.map(([, answer]) => answer).sort());
  });

  it("is imported by nothing a browser loads", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(tsx?|jsx?|mjs)$/.test(name) && readFileSync(path, "utf8").includes("supabase/hangyumi")) offenders.push(path);
      }
    };
    for (const dir of ["app", "components", "lib", "hooks", "contexts"]) walk(join(root, dir));
    expect(offenders).toEqual([]);
  });
});
