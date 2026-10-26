import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { KEYBOARDS, LEVELS, PARTS_OF_SPEECH } from "@/lib/hangyumi/rules";
import { LANGUAGE_CODES, type LanguageCode } from "@/lib/languages";

/* =========================================================
   Hangyumi's drafted word bank (supabase/hangyumi/*.json)

   Chi chose a bank written in advance and approved on a review page:
   60 words a level in each of the five languages (30 until Chi asked
   for more on 2026-10-26), every one with a clue
   in all five that does not give the word away. Every Chinese character
   in it must be Traditional. And no page may import it, or the answers
   would ship to the browser.
   ========================================================= */

const root = join(__dirname, "..");
type Row = [string, string, string, ...string[]];
type BankFile = { language: string; source: string; columns: string[]; words: Row[] };

const bank = Object.fromEntries(LANGUAGE_CODES.map(language => [
  language,
  JSON.parse(readFileSync(join(root, "supabase/hangyumi", `${language}.json`), "utf8")) as BankFile,
])) as Record<LanguageCode, BankFile>;

const key = (value: string) => value.normalize("NFC").toLocaleLowerCase();

/* Characters that exist only in Simplified Chinese, and the ones most
   likely to slip into a clue. */
const SIMPLIFIED = "们这说时为国过还样学发经么见对东头长门问间车马鸟爱当会实现进运动电话请让认识书买卖习写读农业应该个开关钱觉听语区难题欢视务观热办体图华广场备岁变权传营节约师乐号产将处圣复无与气";

const SIMPLIFIED_RE = new RegExp(`[${SIMPLIFIED}]`);

describe("the drafted bank", () => {
  it.each(LANGUAGE_CODES)("%s has 60 words a level, each once", language => {
    const file = bank[language];
    expect(file.language).toBe(language);
    expect(file.columns).toEqual(["level", "answer", "partOfSpeech", ...LANGUAGE_CODES]);
    expect(file.source.length).toBeGreaterThan(10);
    for (const level of LEVELS) {
      expect(file.words.filter(([lvl]) => lvl === level)).toHaveLength(60);
    }
    const keys = file.words.map(([, answer]) => key(answer));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(LANGUAGE_CODES)("%s's answers are clean, guessable and of a known part of speech", language => {
    for (const [level, answer, partOfSpeech] of bank[language].words) {
      expect(LEVELS).toContain(level);
      expect(PARTS_OF_SPEECH).toContain(partOfSpeech);
      expect(answer).toBe(answer.normalize("NFC"));
      expect(answer).toBe(answer.trim());
      const letters = [...key(answer)].filter(char => /\p{L}/u.test(char));
      expect(letters.length).toBeGreaterThan(0);
      if (language === "zh-TW") {
        for (const char of letters) {
          expect(char, answer).toMatch(/\p{Script=Han}/u);
          expect(SIMPLIFIED, `${answer} is not Traditional`).not.toContain(char);
        }
      } else {
        const keyboard = KEYBOARDS[language];
        for (const char of letters) {
          expect([...keyboard.letters, ...keyboard.accents], `${answer}: no key for ${char}`).toContain(char);
        }
      }
    }
  });

  it.each(LANGUAGE_CODES)("%s's clues are all there, Traditional, and never name the word", language => {
    for (const [, answer, , ...clues] of bank[language].words) {
      expect(clues).toHaveLength(5);
      clues.forEach((clue, index) => {
        const clueLanguage = LANGUAGE_CODES[index];
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
    }
  });

  it.each(LANGUAGE_CODES)("%s has a complete card for every word: its reading, and the word in the other four with theirs", language => {
    const cards = JSON.parse(readFileSync(join(root, "supabase/hangyumi/cards", `${language}.json`), "utf8")) as Record<string, Record<string, unknown>>;
    const reads = (side: Record<string, unknown>, as: LanguageCode) => as === "zh-TW"
      ? typeof side.pinyin === "string" && typeof side.zhuyin === "string" && side.pinyin !== "" && side.zhuyin !== ""
      : typeof side.ipa === "string" && /^\/[^/]+\/$/.test(side.ipa);
    const gaps: string[] = [];
    for (const [, answer] of bank[language].words) {
      const card = cards[answer];
      if (!card || !reads(card, language)) { gaps.push(`${answer}: reading`); continue; }
      const translations = (card.translations ?? {}) as Record<string, Record<string, unknown>>;
      for (const other of LANGUAGE_CODES.filter(code => code !== language)) {
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
