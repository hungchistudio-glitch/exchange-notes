import type { LanguageCode } from "@/lib/languages";
import type { LexiconEntry, LexiconLanguages } from "@/lib/lexicon/types";

/* =========================================================
   The language being learned leads

   A lookup comes back as a pair of sides, and which one the model calls
   `term` is decided by what the reader typed. That is the wrong question for
   a learner.

   Someone studying French who types "mow" is not asking to be shown the word
   "mow" in large type. They are asking for *tondre*, and the English is the
   gloss — the same hierarchy every saved card, every review card and every
   Discover story already uses. Leading with the English would make the
   search the only surface in the app that leads with the language the reader
   already knows.

   ── When this does nothing ─────────────────────────────────────────────

   Almost always. The prompt already asks for the language being studied on
   the headword side (see resolveCardLanguages, which the prompt spells out as
   three cases), so this is the guarantee behind that request rather than the
   thing that implements it. It fires only when a model puts the two sides the
   wrong way round.

   ── Why it happens here and not in the view ────────────────────────────

   Because saving reads the same object. A card displayed as *papa* and filed
   as 爸爸 would be the exact drift this whole engine exists to end: the reader
   keeps what they were shown, and what they were shown is what the row
   holds.
   ========================================================= */

export type OrientedResult = {
  entry: LexiconEntry;
  languages: LexiconLanguages;
};

function swap(entry: LexiconEntry): LexiconEntry {
  return {
    ...entry,
    term: entry.translation,
    translation: entry.term,
    termExample: entry.translationExample,
    translationExample: entry.termExample,
    termLanguage: entry.translationLanguage,
    translationLanguage: entry.termLanguage,
    /*
     * The highlight is a span *of the sentence*, so it stays on the side the
     * sentence is on. Swapping its two halves alongside keeps it paired with
     * the right language.
     */
    highlight: entry.highlight
      ? {
          ...entry.highlight,
          term: entry.highlight.translation,
          translation: entry.highlight.term,
        }
      : entry.highlight,
  };
}

/**
 * Turns a result so the language being learned is on the headword side.
 *
 * Returns the input untouched unless the two sides are the wrong way round
 * for this reader — see the note above for how rarely that is.
 */
export function orientToLearner(
  entry: LexiconEntry | null,
  languages: LexiconLanguages,
  learningLanguage: LanguageCode,
): OrientedResult | null {
  if (!entry) return null;

  const shouldSwap =
    languages.glossLanguage === learningLanguage &&
    languages.sourceLanguage !== learningLanguage;

  if (!shouldSwap) return { entry, languages };

  return {
    entry: swap(entry),
    languages: {
      ...languages,
      sourceLanguage: languages.glossLanguage,
      glossLanguage: languages.sourceLanguage,
      /*
       * Deliberately not swapped. The reader typed what they typed, and a
       * correction — "no, that was Italian" — is about their text, not about
       * the headword they were handed back. Pinning the headword's language
       * would re-ask a question nobody asked.
       */
      queryLanguage: languages.queryLanguage,
    },
  };
}
