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
  > &
    Partial<Pick<VocabularyItem, "texts" | "examples">>,
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

  /*
   * The map is the word; the pair is how it used to be stored. Reading the
   * map first is what lets a card show a language the pair could never hold —
   * a third one, added later, on the same row with the same review history.
   */
  const texts = item.texts ?? {};
  const examples = item.examples ?? {};

  const textFor = (code: LanguageCode, fallback: string) =>
    texts[code]?.trim() || fallback;
  const exampleFor = (code: LanguageCode, fallback: string) =>
    examples[code]?.trim() || fallback;

  const wordSide: VocabularyCardSide = {
    text: textFor(wordLanguage, item.word?.trim() ?? ""),
    language: wordLanguage,
    example: exampleFor(wordLanguage, item.example_sentence?.trim() ?? ""),
  };

  const translationSide: VocabularyCardSide = {
    text: textFor(translationLanguage, item.translation?.trim() ?? ""),
    language: translationLanguage,
    example: exampleFor(
      translationLanguage,
      item.translated_example?.trim() ?? "",
    ),
  };

  /*
   * Which language leads, in order of preference.
   *
   * A language the row holds and the reader is learning wins, even when it is
   * neither half of the pair the row was originally saved as — that is the
   * whole point of the map, and it is what makes switching to Spanish show a
   * Spanish card rather than the English one it started life as.
   *
   * Failing that, the side that is *not* the reader's own language leads: an
   * English/Chinese word still in the list after switching to French is not
   * French and cannot be made to be, but one of its sides is still the word
   * and the other is still the gloss. Promoting someone's own language on a
   * vocabulary card is showing them the answer.
   *
   * Failing both, the row keeps the order it was saved in.
   *
   * Nothing here rewrites the row, and nothing here invents a language. A
   * word saved as French → Traditional Chinese stays that until something
   * actually adds a third text to it.
   */
  const learned = texts[learningLanguage]?.trim();

  if (learned && learningLanguage !== wordLanguage &&
      learningLanguage !== translationLanguage) {
    const support =
      nativeLanguage && nativeLanguage !== learningLanguage
        ? ([wordSide, translationSide].find(
            (side) => side.language === nativeLanguage,
          ) ?? wordSide)
        : wordSide;

    return {
      primary: {
        text: learned,
        language: learningLanguage,
        example: examples[learningLanguage]?.trim() ?? "",
      },
      secondary: support,
      matchesLearningLanguage: true,
    };
  }

  const translationLeads =
    translationLanguage === learningLanguage ||
    (wordLanguage !== learningLanguage &&
      nativeLanguage !== undefined &&
      wordLanguage === nativeLanguage &&
      translationLanguage !== nativeLanguage);

  return {
    primary: translationLeads ? translationSide : wordSide,
    secondary: translationLeads ? wordSide : translationSide,
    matchesLearningLanguage: Boolean(texts[learningLanguage]?.trim()) ||
      wordLanguage === learningLanguage ||
      translationLanguage === learningLanguage,
  };
}
