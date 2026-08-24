import { DEFAULT_LEARNING_PAIR, type LanguageCode } from "@/lib/languages";
import type { VocabularyItem } from "@/lib/types/app";

export type VocabularyCardSide = {
  text: string;
  language: LanguageCode;
  example: string;
};

export type VocabularyCardSides = {
  primary: VocabularyCardSide;
  secondary: VocabularyCardSide;
  /**
   * Whether this row's own language is the one the reader is currently
   * learning.
   *
   * False for a word saved under a different pairing — a French word still in
   * the list after switching to Spanish. Screens can use it to say so; none
   * of them should use it to hide the row, and none of them should use it to
   * decide which side leads. That question is settled by the row.
   */
  matchesLearningLanguage: boolean;
};

/**
 * Which side of a saved word leads, and in what language.
 *
 * ── The headword is the word ───────────────────────────────────────────
 *
 * A card leads in the language it was saved in. `mow` stays "mow", `tondre`
 * stays "tondre", and neither of them becomes Italian because the reader
 * started studying Italian in March. The library is not a view of the
 * language currently being learned; it is what somebody has collected across
 * languages and across years, and every card in it keeps the language it was
 * born in.
 *
 * This is a reversal, and a deliberate one. The rule used to be that any
 * language the row happened to hold could take the lead if the reader was
 * learning it — which read well in isolation and had one fatal consequence:
 * the background fill (hooks/useVocabularyLanguageFill.ts) eventually gives
 * *every* row a text in the current learning language, so eventually every
 * card in the library led in the same language and no card could be told
 * from another. A library where everything is Italian is not a library that
 * remembers you once studied French.
 *
 * ── The other languages become the gloss ───────────────────────────────
 *
 * They are not wasted. The fill's work is what lets the same French card be
 * glossed in Chinese for a Chinese reader and in Spanish for a Spanish one,
 * which is what the second side is for. Order of preference:
 *
 *   1. the language the reader reads the app in (resolved by
 *      useDisplayLanguages — the language they most recently said they read
 *      comfortably)
 *   2. the language the row was glossed in when it was saved
 *   3. the language being learned, as a last resort
 *
 * Nothing here rewrites the row, and nothing here invents a language. A word
 * saved as French → Traditional Chinese stays that, whatever the profile
 * says today; the profile decides what new words default to, not what old
 * ones meant.
 */
export function getVocabularyCardSides(
  item: Pick<
    VocabularyItem,
    | "word"
    | "translation"
    | "word_language"
    | "translation_language"
    | "example_sentence"
    | "translated_example"
  > &
    Partial<Pick<VocabularyItem, "texts" | "examples">>,
  learningLanguage: LanguageCode,
  /**
   * The language the card is glossed in — the interface language, resolved
   * by useDisplayLanguages. Optional so a caller that genuinely has no
   * profile still gets an answer rather than an error.
   */
  supportLanguage?: LanguageCode,
): VocabularyCardSides {
  const termLanguage = item.word_language ?? DEFAULT_LEARNING_PAIR[0];
  const storedGlossLanguage =
    item.translation_language ?? DEFAULT_LEARNING_PAIR[1];

  /*
   * The map is the word; the pair is how it used to be stored. Reading the
   * map first is what lets the gloss be a language the pair could never
   * hold — a third one, added later, on the same row.
   */
  const texts = item.texts ?? {};
  const examples = item.examples ?? {};

  const primary: VocabularyCardSide = {
    text: texts[termLanguage]?.trim() || item.word?.trim() || "",
    language: termLanguage,
    example:
      examples[termLanguage]?.trim() || item.example_sentence?.trim() || "",
  };

  /*
   * The stored gloss is reachable even when the map has not caught up with
   * it: `translation` is the text this row was saved with, and it is in
   * translation_language by definition.
   */
  const glossText = (code: LanguageCode) =>
    texts[code]?.trim() ||
    (code === storedGlossLanguage ? item.translation?.trim() ?? "" : "");

  const glossExample = (code: LanguageCode) =>
    examples[code]?.trim() ||
    (code === storedGlossLanguage
      ? item.translated_example?.trim() ?? ""
      : "");

  const preference: LanguageCode[] = [];

  for (const code of [supportLanguage, storedGlossLanguage, learningLanguage]) {
    if (!code || code === termLanguage || preference.includes(code)) continue;
    preference.push(code);
  }

  const glossLanguage =
    preference.find((code) => glossText(code)) ?? preference[0];

  const secondary: VocabularyCardSide = glossLanguage
    ? {
        text: glossText(glossLanguage),
        language: glossLanguage,
        example: glossExample(glossLanguage),
      }
    : /*
       * Nothing to gloss with: every language the reader has is the language
       * the word is already in. An empty side, which every renderer skips —
       * the same text twice is not two sides.
       */
      { text: "", language: termLanguage, example: "" };

  return {
    primary,
    secondary,
    matchesLearningLanguage: termLanguage === learningLanguage,
  };
}
