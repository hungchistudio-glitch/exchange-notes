import { identityKey, matchKey, normalizeQuery } from "@/lib/lexicon/normalize";
import { isLanguageCode, type LanguageCode } from "@/lib/languages";
import type { VocabularyItem } from "@/lib/types/app";

/* =========================================================
   Layer one: the words the reader already has

   Searched before anything is asked of a model, and shown separately from
   what the dictionary says, because "you saved this in March" is a
   different and better answer than "here is what it means". Merging the two
   into one ranked list was the tempting design and it loses the only piece
   of information the reader could not have got anywhere else.

   Everything here runs against an array already in memory. No network, no
   IndexedDB read, no await — which is what makes it safe to run on every
   keystroke while the dictionary waits for a submit.
   ========================================================= */

/** Enough matches to be useful; more than this is a filter, not an answer. */
const MAX_MATCHES = 6;

type Ranked = { item: VocabularyItem; rank: number };

/**
 * Every way this row spells itself, keyed for loose matching.
 *
 * `texts` is the real answer — a row is one concept in N languages — with
 * `word` and `translation` included because rows written before that column
 * existed still exist. Accents are folded here and only here: this is the
 * finding path, and a reader who types "ete" should still be shown "été".
 */
function spellings(item: VocabularyItem): string[] {
  const values = [
    ...Object.values(item.texts ?? {}),
    item.word,
    item.translation,
  ];

  return values
    .map((value) => matchKey(String(value ?? "")))
    .filter((value) => value.length > 0);
}

/**
 * The reader's own words that match, best first.
 *
 * Ranked exact → prefix → contained, which is the order a person scanning
 * the list would put them in themselves. Ties keep library order, so the
 * result does not reshuffle as an unrelated word is edited elsewhere.
 */
export function searchPersonal(
  items: readonly VocabularyItem[],
  query: string,
  limit = MAX_MATCHES,
): VocabularyItem[] {
  const needle = matchKey(query);

  if (!needle) return [];

  const ranked: Ranked[] = [];

  for (const item of items) {
    const texts = spellings(item);

    if (texts.length === 0) continue;

    const rank = texts.some((text) => text === needle)
      ? 0
      : texts.some((text) => text.startsWith(needle))
        ? 1
        : texts.some((text) => text.includes(needle))
          ? 2
          : -1;

    if (rank >= 0) ranked.push({ item, rank });
  }

  return ranked
    .sort((left, right) => left.rank - right.rank)
    .slice(0, limit)
    .map((entry) => entry.item);
}

/**
 * The row that is already this word, or null.
 *
 * Strict where searchPersonal is generous, and deliberately so — see the
 * note in lib/lexicon/normalize.ts. Accents are letters here: *papá* is not
 * a duplicate of *papa*, and refusing to save the second one because a
 * folded key collided is a data loss the reader cannot undo.
 *
 * The language is half the key. The same eight letters can be an Italian
 * word and a Spanish one, and those are two cards with two meanings and two
 * review histories, not one card saved twice.
 */
export function findDuplicate(
  items: readonly VocabularyItem[],
  term: string,
  language: LanguageCode,
): VocabularyItem | null {
  const key = identityKey(term, language);

  if (!normalizeQuery(term)) return null;

  for (const item of items) {
    /*
     * Matched against the row's own language, never the reader's current
     * one. A library switched from English to French must not suddenly
     * consider every English word a French duplicate.
     */
    const itemLanguage = isLanguageCode(item.word_language)
      ? item.word_language
      : null;

    if (!itemLanguage) continue;

    if (identityKey(item.word ?? "", itemLanguage) === key) return item;

    /*
     * A word can also be *in* a row without being its headword: the row for
     * "tondre" glossed as "to mow" holds both, and saving "to mow" as a
     * second card would give the reader the same fact twice.
     */
    const sameLanguageText = item.texts?.[language];

    if (sameLanguageText && identityKey(sameLanguageText, language) === key) {
      return item;
    }
  }

  return null;
}
