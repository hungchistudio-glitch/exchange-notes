import "server-only";

import type { LanguageCode } from "@/lib/languages";
import { lemmaCandidates } from "@/lib/lexicon/inflection";
import type { LexiconEntry } from "@/lib/lexicon/types";
import type { VocabularyCategory } from "@/lib/types/app";
import { CORE_LEXICON_SOURCE } from "@/lib/vocabulary/coreLexiconData";

/* =========================================================
   The built-in five-language dictionary — looking a word up

   The last answer the server has when Gemini is busy and the basic
   translation service (MyMemory) is too: see lookupOffline. The data and
   how it was made are in coreLexiconData.ts.

   A typed word is matched the way a reader types it, not the way the
   dictionary spells it:

   - case, spacing and trailing punctuation do not matter ("Merci !");
   - a leading article or English "to" does not either ("la maison",
     "l'eau", "to eat") — but an entry whose own form starts with one wins
     first, so "to go" is the takeaway phrase and "go" is still the verb;
   - accents are forgiven last ("cafe", "pere"), after every exact match.
   ========================================================= */

export type CoreWord = {
  partOfSpeech: "noun" | "verb" | "adjective" | "phrase" | "other";
  category: VocabularyCategory;
  /** Every accepted form per language; the first is the one a card shows. */
  forms: Record<LanguageCode, readonly string[]>;
};

const LANGUAGE_ORDER: readonly LanguageCode[] = ["en", "zh-TW", "es", "fr", "it"];

const PARTS_OF_SPEECH = new Set(["noun", "verb", "adjective", "phrase", "other"]);
const CATEGORIES = new Set(["people", "objects", "actions", "other"]);

function parse(source: string): CoreWord[] {
  const words: CoreWord[] = [];

  for (const line of source.split("\n")) {
    const fields = line.trim().split("|");
    if (fields.length !== 7) continue;

    const [partOfSpeech, category, ...languages] = fields;
    if (!PARTS_OF_SPEECH.has(partOfSpeech) || !CATEGORIES.has(category)) continue;

    words.push({
      partOfSpeech: partOfSpeech as CoreWord["partOfSpeech"],
      category: category as VocabularyCategory,
      forms: Object.fromEntries(
        LANGUAGE_ORDER.map((language, index) => [
          language,
          languages[index]
            .split(";")
            .map((form) => form.trim())
            .filter(Boolean),
        ]),
      ) as Record<LanguageCode, string[]>,
    });
  }

  return words;
}

/* ---------- normalising what was typed ---------- */

const LEADING_ARTICLE: Record<LanguageCode, RegExp | null> = {
  en: /^(?:to|the|an?)\s+/,
  "zh-TW": null,
  es: /^(?:el|la|los|las|un|una|unos|unas)\s+/,
  fr: /^(?:(?:le|la|les|un|une|des|du|de la)\s+|l'|de l')/,
  it: /^(?:(?:il|lo|la|i|gli|le|un|uno|una)\s+|l'|un')/,
};

/** Case, width, spacing, curly apostrophes and trailing punctuation. */
export function normalizeTyped(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[‘’ʼ`´]/g, "'")
    .toLocaleLowerCase()
    .replace(/^[\s¿¡"“”«»]+/, "")
    .replace(/[\s.!?,;:…。！？，；：、"“”«»]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function withoutArticle(text: string, language: LanguageCode): string {
  const article = LEADING_ARTICLE[language];
  return article ? text.replace(article, "") : text;
}

function withoutAccents(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");
}

/* ---------- the index ---------- */

type Index = Map<string, CoreWord>;

const WORDS = parse(CORE_LEXICON_SOURCE);

/*
 * Four views of every form, asked in order: as written, without a leading
 * article, and the same two without accents. The first entry to claim a
 * key keeps it, which is what the order of the data is for.
 */
const INDEXES: readonly Index[] = (() => {
  const exact: Index = new Map();
  const bare: Index = new Map();
  const exactFolded: Index = new Map();
  const bareFolded: Index = new Map();

  const claim = (index: Index, key: string, word: CoreWord) => {
    if (key && !index.has(key)) index.set(key, word);
  };

  for (const word of WORDS) {
    for (const language of LANGUAGE_ORDER) {
      for (const form of word.forms[language]) {
        const typed = normalizeTyped(form);
        const stripped = withoutArticle(typed, language);

        claim(exact, `${language}:${typed}`, word);
        claim(bare, `${language}:${stripped}`, word);
        claim(exactFolded, `${language}:${withoutAccents(typed)}`, word);
        claim(bareFolded, `${language}:${withoutAccents(stripped)}`, word);
      }
    }
  }

  return [exact, bare, exactFolded, bareFolded];
})();

/** How many entries the dictionary holds. */
export const CORE_LEXICON_SIZE = WORDS.length;

function lookUp(typed: string, language: LanguageCode): CoreWord | null {
  const stripped = withoutArticle(typed, language);
  const keys = [
    typed,
    stripped,
    withoutAccents(typed),
    withoutAccents(stripped),
  ];

  for (const [position, index] of INDEXES.entries()) {
    const hit = index.get(`${language}:${keys[position]}`);
    if (hit) return hit;
  }

  return null;
}

/**
 * The entry this text names in `language`, if the dictionary has it — as
 * typed first, then as the dictionary form it most likely is ("shoes" →
 * "shoe", "navi" → "nave"; see lib/lexicon/inflection.ts).
 */
export function findCoreWord(
  text: string,
  language: LanguageCode,
  { inflected = true }: { inflected?: boolean } = {},
): CoreWord | null {
  const typed = normalizeTyped(text);
  if (!typed) return null;

  const exact = lookUp(typed, language);
  if (exact || !inflected) return exact;

  const bare = withoutArticle(typed, language);
  for (const lemma of lemmaCandidates(bare, language)) {
    const hit = lookUp(lemma, language);
    if (hit) return hit;
  }

  return null;
}

/**
 * Whether `typed` is one of `forms`, the way findCoreWord would match it:
 * case, punctuation, a leading article and accents aside.
 */
export function matchesForm(
  forms: readonly string[],
  typed: string,
  language: LanguageCode,
): boolean {
  const key = (text: string) =>
    withoutAccents(withoutArticle(normalizeTyped(text), language));
  const wanted = key(typed);
  return Boolean(wanted) && forms.some((form) => key(form) === wanted);
}

/**
 * The first of `languages` in which this text is a word the dictionary has,
 * and the entry — for a query whose language was only guessed.
 */
export function findCoreWordIn(
  text: string,
  languages: readonly LanguageCode[],
): { word: CoreWord; language: LanguageCode } | null {
  for (const language of new Set(languages)) {
    const word = findCoreWord(text, language);
    if (word) return { word, language };
  }
  return null;
}

/**
 * A dictionary card for one entry, with no request behind it.
 *
 * Marked as a basic translation — the app's "簡易翻譯" — because that is
 * what it is: the word in both languages and nothing more. No example
 * sentences: an invented sentence is what the offline path learned not to
 * write (see unresolvedEntry in offlineLookup.ts).
 */
export function coreWordEntry(
  word: CoreWord,
  termLanguage: LanguageCode,
  translationLanguage: LanguageCode,
  queryLanguage: LanguageCode = termLanguage,
): LexiconEntry {
  return {
    term: word.forms[termLanguage][0],
    translation: word.forms[translationLanguage][0],
    partOfSpeech: word.partOfSpeech,
    termExample: "",
    translationExample: "",
    confidence: "medium",
    category: word.category,
    termLanguage,
    translationLanguage,
    queryLanguage,
    kind: word.partOfSpeech === "phrase" ? "phrase" : "word",
    highlight: null,
    basicTranslation: true,
  };
}
