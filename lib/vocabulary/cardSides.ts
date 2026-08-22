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
   * Whether this row is in the language the reader is currently learning.
   *
   * False for a word saved under a different pairing — a French word still in
   * the list after switching to Spanish. Screens can use it to say so; none
   * of them should use it to hide the row.
   */
  matchesLearningLanguage: boolean;
};

/**
 * Which side of a saved word leads, and in what language.
 *
 * The rule is the same one the whole app uses: the language being learned is
 * the hero, the language already spoken is the support. What is new is that
 * it is asked of the row rather than assumed — every row records the two
 * languages it actually holds, so switching from English to Spanish re-reads
 * the same data instead of relabelling it.
 *
 * A row in neither of the reader's current languages keeps its stored order.
 * That is the case the old boolean could not express: "is the user learning
 * Chinese" has no answer for a French word held by someone studying Spanish,
 * and answering "no" silently meant "English leads".
 *
 * Nothing here rewrites the row. A word saved as French → Traditional Chinese
 * stays that, whatever the profile says today; the profile decides what new
 * words default to, not what old ones meant.
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
  >,
  learningLanguage: LanguageCode,
  /**
   * The reader's own language, used only when neither side is the one being
   * learned. Optional so a caller that genuinely has no profile still gets an
   * answer rather than an error.
   */
  nativeLanguage?: LanguageCode,
): VocabularyCardSides {
  const wordLanguage = item.word_language ?? DEFAULT_LEARNING_PAIR[0];
  const translationLanguage =
    item.translation_language ?? DEFAULT_LEARNING_PAIR[1];

  const wordSide: VocabularyCardSide = {
    text: item.word?.trim() ?? "",
    language: wordLanguage,
    example: item.example_sentence?.trim() ?? "",
  };

  const translationSide: VocabularyCardSide = {
    text: item.translation?.trim() ?? "",
    language: translationLanguage,
    example: item.translated_example?.trim() ?? "",
  };

  /*
   * Three rules, in order.
   *
   * The side in the language being learned leads — which is why switching
   * from English to Chinese flips a card without touching it.
   *
   * When neither side is that language — an English/Chinese word still in the
   * list after switching to Spanish — the side that is *not* the reader's own
   * language leads instead. It is still the word; the other side is still the
   * gloss. Promoting someone's own language to hero on a vocabulary card
   * would be showing them the answer.
   *
   * Failing both, the row keeps the order it was saved in. Nothing here
   * rewrites it: a word saved as French → Traditional Chinese stays that,
   * whatever the profile says today.
   */
  const translationLeads =
    translationLanguage === learningLanguage ||
    (wordLanguage !== learningLanguage &&
      nativeLanguage !== undefined &&
      wordLanguage === nativeLanguage &&
      translationLanguage !== nativeLanguage);

  return {
    primary: translationLeads ? translationSide : wordSide,
    secondary: translationLeads ? wordSide : translationSide,
    matchesLearningLanguage:
      wordLanguage === learningLanguage ||
      translationLanguage === learningLanguage,
  };
}
