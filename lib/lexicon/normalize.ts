import { getLanguage, type LanguageCode } from "@/lib/languages";

/* =========================================================
   Two different questions about the same string

   "Is this the word I already have?" and "is this the word I meant?" want
   different amounts of forgiveness, and collapsing them into one normalizer
   is how an app ends up believing that *papa* and *papá* are the same
   Spanish word. They are not: one is a potato and the other is a father.

   So there are two keys here.

   `matchKey` is generous — accents folded away — and is used for *finding*:
   the reader who types "ete" should be shown "été". Nothing is stored under
   it and nothing is deduplicated by it.

   `identityKey` is strict — case-folded and canonically composed, accents
   intact — and is what decides whether a word is already in the library.
   Paired with the language, because "come" is an English verb and an
   Italian conjunction and they are two cards, not one.
   ========================================================= */

/**
 * The query as the rest of the app should see it: composed, trimmed, and
 * with runs of whitespace collapsed.
 *
 * NFKC rather than NFC because half of the input to this app arrives from a
 * phone keyboard in a CJK locale, where a full-width Latin letter is an
 * ordinary thing to type by accident. NFKC folds those to their normal
 * forms; NFC leaves "ｍｏｗ" as a word the dictionary has never heard of.
 */
export function normalizeQuery(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

/**
 * Lower-cased, accent-folded, punctuation-stripped. For matching only.
 *
 * NFD splits a letter from its accent so the combining marks can be removed
 * on their own; the result is re-composed so that what comes out is still a
 * valid string to compare against another matchKey. Han characters have no
 * combining marks to strip and no case to fold, so they pass through this
 * untouched — which is the correct Latin-style-normalization-free treatment
 * for Chinese rather than a special case bolted on.
 */
export function matchKey(value: string): string {
  return normalizeQuery(value)
    .toLocaleLowerCase("en-US")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .normalize("NFC")
    .replace(/[‘’]/g, "'")
    .replace(/[^\p{Letter}\p{Number}' ]/gu, "")
    .trim();
}

/**
 * What makes two saved words the same word.
 *
 * Case-folded, because "Mow", "mow" and "MOW" are one word typed three ways.
 * Accents kept, because they are letters. And always carrying the language,
 * because the same spelling in two languages is two words — which is exactly
 * what a duplicate check keyed on the spelling alone gets wrong, and it gets
 * it wrong in the direction that loses data: it refuses to save the second
 * one.
 */
export function identityKey(term: string, language: LanguageCode): string {
  return `${language}:${normalizeQuery(term)
    .normalize("NFC")
    .toLocaleLowerCase("en-US")}`;
}

/**
 * Whether two strings differ only by accents.
 *
 * The test behind "did you mean été?" — true for ete/été, false for
 * ete/etre. Used to offer a correction, never to apply one.
 */
export function differsOnlyByAccent(left: string, right: string): boolean {
  const a = normalizeQuery(left).toLocaleLowerCase("en-US");
  const b = normalizeQuery(right).toLocaleLowerCase("en-US");

  return a !== b && matchKey(a) === matchKey(b) && matchKey(a).length > 0;
}

/**
 * The canonical form to store, given what the reader typed and what the
 * dictionary came back with.
 *
 * The dictionary's spelling wins when the two differ only by accents — the
 * reader typed "ete" because their keyboard makes "été" awkward, not because
 * they meant a different word, and the library should hold the word as the
 * language writes it. Anything more than an accent apart is left alone: a
 * model that answers a different word than the one asked about is a thing to
 * show, not a thing to silently substitute.
 */
export function canonicalTerm(typed: string, fromDictionary: string): string {
  const typedText = normalizeQuery(typed);
  const dictionaryText = normalizeQuery(fromDictionary);

  if (!dictionaryText) return typedText;
  if (differsOnlyByAccent(typedText, dictionaryText)) return dictionaryText;

  return dictionaryText;
}

/**
 * Text that can be compared at all in this language.
 *
 * Chinese is the reason: its words carry no case and no accents, so a
 * Latin-style fold is a no-op that costs a pass over the string, and the
 * punctuation strip would take out the very characters being searched for
 * if the ranges were ever widened. Asked of the language rather than
 * sniffed off the text, so a mixed string follows the language it was filed
 * under.
 */
export function searchKey(value: string, language?: LanguageCode): string {
  if (language && getLanguage(language).fontVariable === "--font-cjk") {
    return normalizeQuery(value);
  }

  return matchKey(value);
}
