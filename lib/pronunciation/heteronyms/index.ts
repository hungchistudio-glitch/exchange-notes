import type { LanguageCode } from "@/lib/languages";
import { normalizePartOfSpeech } from "@/lib/vocabulary/partOfSpeech";

import { EN_HETERONYMS } from "./en";
import { ES_HETERONYMS, FR_HETERONYMS, IT_HETERONYMS } from "./romance";
import type { Heteronym, HeteronymReading } from "./types";
import { ZH_TW_HETERONYMS } from "./zh-TW";

export type { Heteronym, HeteronymReading } from "./types";

/* =========================================================
   Which words read more than one way, and which way here

   Looked up by what the reader is looking at: a Chinese word is searched
   character by character (行 inside 銀行), the rest as a whole word with
   its accents set aside, so "publico", "público" and "publicó" all find
   the same three readings.

   Which reading the word on screen uses is said only when it can be told
   — never guessed:

     zh-TW   the word's own zhuyin, character by character (銀行 → ㄏㄤˊ);
             a single character alone could be any of them
     others  the spelling, when the accent decides it (publicó); else the
             transcription the lookup brought (/rɪˈkɔrd/); else the part of
             speech, when only one reading has it (a noun: /ˈrɛkərd/)
   ========================================================= */

const HETERONYMS: Readonly<Record<LanguageCode, readonly Heteronym[]>> = {
  "zh-TW": ZH_TW_HETERONYMS,
  en: EN_HETERONYMS,
  es: ES_HETERONYMS,
  fr: FR_HETERONYMS,
  it: IT_HETERONYMS,
};

/** Every listed word of a language, for the Lab. */
export function heteronymsFor(language: LanguageCode): readonly Heteronym[] {
  return HETERONYMS[language] ?? [];
}

export type HeteronymMatch = {
  heteronym: Heteronym;
  /** Chinese: the character in the text it was found for. */
  character?: string;
  /** The reading the text uses, when that can be told. */
  used: number | null;
};

export type ReadingContext = {
  /** The text's part of speech, as a lookup gives it. */
  partOfSpeech?: string | null;
  /** IPA for the text, when known. */
  ipa?: string | null;
  /** Zhuyin for the text, one syllable per character, when known. */
  zhuyin?: string | null;
};

/** At most this many characters of a Chinese word are explained at once. */
const MAX_CHARACTERS = 3;
const CJK = /[一-鿿]/;

const fold = (text: string) =>
  text.normalize("NFD").replace(/\p{M}/gu, "").trim().toLocaleLowerCase();

const exact = (text: string) => text.normalize("NFC").trim().toLocaleLowerCase();

/** IPA without the marks two transcriptions of one reading may differ in. */
const bareIpa = (ipa: string) => ipa.replace(/[/[\]ˈˌ.‿ːˑ\s]/g, "");

function indexWhere(readings: readonly HeteronymReading[], test: (reading: HeteronymReading) => boolean) {
  const found = readings.flatMap((reading, index) => (test(reading) ? [index] : []));
  return found.length === 1 ? found[0] : null;
}

const byLanguage = new Map<LanguageCode, Map<string, Heteronym>>();

function lookup(language: LanguageCode): Map<string, Heteronym> {
  let table = byLanguage.get(language);
  if (table) return table;
  table = new Map();
  for (const heteronym of heteronymsFor(language)) {
    table.set(language === "zh-TW" ? heteronym.word : fold(heteronym.word), heteronym);
  }
  byLanguage.set(language, table);
  return table;
}

function usedInChinese(text: string, index: number, heteronym: Heteronym, zhuyin?: string | null) {
  const characters = Array.from(text);
  if (characters.length < 2 || !zhuyin) return null;
  const syllables = zhuyin.trim().split(/\s+/);
  if (syllables.length !== characters.length) return null;
  return indexWhere(heteronym.readings, (reading) => reading.phonetic === syllables[index]);
}

function usedInWord(text: string, heteronym: Heteronym, context: ReadingContext) {
  const { readings } = heteronym;
  const written = exact(text);
  const bySpelling = indexWhere(readings, (reading) => reading.spelling !== undefined && exact(reading.spelling) === written);
  if (bySpelling !== null) return bySpelling;

  if (context.ipa) {
    const said = bareIpa(context.ipa);
    const byIpa = indexWhere(readings, (reading) => bareIpa(reading.phonetic) === said);
    if (byIpa !== null) return byIpa;
  }

  if (context.partOfSpeech) {
    const part = normalizePartOfSpeech(context.partOfSpeech);
    if (part !== "other") return indexWhere(readings, (reading) => reading.partOfSpeech === part);
  }
  return null;
}

/**
 * The listed words in `text` that read more than one way, each with the
 * reading `text` uses where that can be told.
 */
export function findHeteronyms(
  text: string,
  language: LanguageCode,
  context: ReadingContext = {},
): HeteronymMatch[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const table = lookup(language);

  if (language === "zh-TW") {
    const matches: HeteronymMatch[] = [];
    const seen = new Set<string>();
    Array.from(trimmed).forEach((character, index) => {
      if (!CJK.test(character) || seen.has(character) || matches.length >= MAX_CHARACTERS) return;
      const heteronym = table.get(character);
      if (!heteronym) return;
      seen.add(character);
      matches.push({
        heteronym,
        character,
        used: usedInChinese(trimmed, index, heteronym, context.zhuyin),
      });
    });
    return matches;
  }

  const heteronym = table.get(fold(trimmed));
  return heteronym ? [{ heteronym, used: usedInWord(trimmed, heteronym, context) }] : [];
}
