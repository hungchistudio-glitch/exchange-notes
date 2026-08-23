import { describe, expect, it } from "vitest";

import { getVocabularyCardSides } from "@/lib/vocabulary/cardSides";
import type { VocabularyItem } from "@/lib/types/app";

/*
 * A word saved as English → Traditional Chinese, later given Italian and
 * French by the background fill. Switching learning language has to re-read
 * the same row rather than relabel it.
 */
const word = {
  word: "developmental",
  translation: "發展的",
  word_language: "en",
  translation_language: "zh-TW",
  example_sentence: "A developmental stage.",
  translated_example: "一個發展階段。",
  texts: {
    en: "developmental",
    "zh-TW": "發展的",
    it: "evolutivo",
    fr: "développemental",
  },
  examples: {
    en: "A developmental stage.",
    "zh-TW": "一個發展階段。",
    it: "Una fase evolutiva.",
    fr: "Une étape développementale.",
  },
} as unknown as VocabularyItem;

describe("vocabulary card sides", () => {
  it("leads with Italian once the row holds Italian", () => {
    const sides = getVocabularyCardSides(word, "it", "zh-TW");

    expect(sides.primary.text).toBe("evolutivo");
    expect(sides.primary.language).toBe("it");
    expect(sides.primary.example).toBe("Una fase evolutiva.");
    expect(sides.matchesLearningLanguage).toBe(true);
  });

  it("supports it with the reader's own language, not with English", () => {
    // Promoting the language you already speak is showing you the answer;
    // showing English to a Chinese speaker studying Italian is showing them
    // a third language for no reason.
    expect(getVocabularyCardSides(word, "it", "zh-TW").secondary.language).toBe(
      "zh-TW",
    );
  });

  it("leads with French for a French learner, from the same row", () => {
    const sides = getVocabularyCardSides(word, "fr", "zh-TW");

    expect(sides.primary.text).toBe("développemental");
    expect(sides.primary.language).toBe("fr");
  });

  it("falls back honestly when the row has no Italian yet", () => {
    // This is what 286 of the library still looks like: the fill has not
    // reached it. English leads because it is the side that is not the
    // reader's own language — not because anything is broken.
    const untranslated = {
      ...word,
      texts: { en: "developmental", "zh-TW": "發展的" },
      examples: {},
    } as unknown as VocabularyItem;

    const sides = getVocabularyCardSides(untranslated, "it", "zh-TW");

    expect(sides.primary.language).toBe("en");
    expect(sides.matchesLearningLanguage).toBe(false);
  });
});

/* =========================================================
   The gloss comes out of the map, not off the stored pair
   ========================================================= */

describe("the supporting side", () => {
  // The exact row from the screenshot: saved as Spanish/Chinese long before
  // Italian was being learned, and holding all five languages since.
  const tiAmo = {
    word: "te amo",
    translation: "我愛你",
    word_language: "es" as const,
    translation_language: "zh-TW" as const,
    example_sentence: null,
    translated_example: null,
    texts: {
      en: "I love you",
      es: "te amo",
      fr: "je t'aime",
      it: "ti amo",
      "zh-TW": "我愛你",
    },
    examples: {},
  };

  it("glosses in the reader's language, not the one the row was saved as", () => {
    // The regression: this looked for the support language among the two
    // sides the row was *saved* as and fell back to whichever came first
    // when it was neither — so an Italian card was glossed in Spanish for a
    // reader who had never chosen Spanish, while "I love you" sat unread in
    // the same row.
    const sides = getVocabularyCardSides(tiAmo, "it", "en");

    expect(sides.primary.text).toBe("ti amo");
    expect(sides.secondary.text).toBe("I love you");
    expect(sides.secondary.language).toBe("en");
  });

  it("follows the interface language wherever it points", () => {
    expect(getVocabularyCardSides(tiAmo, "it", "fr").secondary.text).toBe(
      "je t'aime",
    );
    expect(getVocabularyCardSides(tiAmo, "es", "zh-TW").secondary.text).toBe(
      "我愛你",
    );
  });

  it("leaves the gloss empty rather than reaching for an unchosen language", () => {
    const sparse = { ...tiAmo, texts: { es: "te amo", it: "ti amo" } };

    const sides = getVocabularyCardSides(sparse, "it", "en");

    expect(sides.primary.text).toBe("ti amo");
    // Every renderer skips a blank gloss. None of them skips a Spanish one.
    expect(sides.secondary.text).toBe("");
  });
});
