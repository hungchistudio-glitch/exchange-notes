import { describe, expect, it } from "vitest";

import { getVocabularyCardSides } from "@/lib/vocabulary/cardSides";
import type { VocabularyItem } from "@/lib/types/app";

/*
 * A word saved as English → Traditional Chinese, later given Italian and
 * French by the background fill.
 *
 * The fill is the reason this file's rule was reversed. It eventually gives
 * every row a text in whatever is being learned, so a rule that let the
 * learning language lead meant that after a while every card in the library
 * led in the same language and none of them could be told apart. A card
 * leads in the language it was saved in; the fill's other languages become
 * the gloss.
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
  it("keeps leading in the language it was saved in", () => {
    const sides = getVocabularyCardSides(word, "it", "zh-TW");

    expect(sides.primary.text).toBe("developmental");
    expect(sides.primary.language).toBe("en");
    expect(sides.primary.example).toBe("A developmental stage.");
  });

  it("says whether the row is in the language being learned", () => {
    // Used to label a row, never to hide one — an English word is still in
    // the library of somebody studying Italian.
    expect(getVocabularyCardSides(word, "it", "zh-TW").matchesLearningLanguage)
      .toBe(false);
    expect(getVocabularyCardSides(word, "en", "zh-TW").matchesLearningLanguage)
      .toBe(true);
  });

  it("glosses in the language the reader reads the app in", () => {
    const sides = getVocabularyCardSides(word, "it", "zh-TW");

    expect(sides.secondary.language).toBe("zh-TW");
    expect(sides.secondary.text).toBe("發展的");
  });

  it("uses the fill's other languages as the gloss, not as the headword", () => {
    // The whole value of the fill, in its right place: the same English card
    // is glossed in French for a French-reading account.
    const sides = getVocabularyCardSides(word, "it", "fr");

    expect(sides.primary.text).toBe("developmental");
    expect(sides.secondary.text).toBe("développemental");
    expect(sides.secondary.language).toBe("fr");
  });

  it("falls back to the stored pair when the row has nothing else", () => {
    const untranslated = {
      ...word,
      texts: { en: "developmental", "zh-TW": "發展的" },
      examples: {},
    } as unknown as VocabularyItem;

    const sides = getVocabularyCardSides(untranslated, "it", "fr");

    expect(sides.primary.language).toBe("en");
    // French is not in the row, so the gloss is what the row was saved with.
    expect(sides.secondary.language).toBe("zh-TW");
    expect(sides.secondary.text).toBe("發展的");
  });
});

/* =========================================================
   Switching languages must not relabel anything
   ========================================================= */

describe("language identity across a settings change", () => {
  const tondre = {
    word: "tondre",
    translation: "mow",
    word_language: "fr" as const,
    translation_language: "en" as const,
    example_sentence: null,
    translated_example: null,
    texts: { fr: "tondre", en: "mow", it: "falciare", "zh-TW": "修剪" },
    examples: {},
  } as unknown as VocabularyItem;

  it("stays French after the reader moves to Italian and Chinese", () => {
    // Day 1: saved while studying French, glossed in English.
    expect(getVocabularyCardSides(tondre, "fr", "en").primary.language).toBe(
      "fr",
    );

    // Day 2: studying Italian, reading the app in Chinese. Same row.
    const later = getVocabularyCardSides(tondre, "it", "zh-TW");

    expect(later.primary.text).toBe("tondre");
    expect(later.primary.language).toBe("fr");
    // Not "falciare": the row holds Italian, and the row is still French.
    expect(later.secondary.text).toBe("修剪");
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

  it("glosses in the reader's language while the headword stays Spanish", () => {
    const sides = getVocabularyCardSides(tiAmo, "it", "en");

    expect(sides.primary.text).toBe("te amo");
    expect(sides.primary.language).toBe("es");
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

  it("falls back to the gloss the row was saved with", () => {
    // The map has lost Chinese, but `translation` is still the text this row
    // was saved with and is still Chinese by definition.
    const sparse = { ...tiAmo, texts: { es: "te amo", it: "ti amo" } };

    const sides = getVocabularyCardSides(sparse, "it", "en");

    expect(sides.primary.text).toBe("te amo");
    expect(sides.secondary.text).toBe("我愛你");
    expect(sides.secondary.language).toBe("zh-TW");
  });

  it("reaches for the language being learned only when nothing else answers", () => {
    const noStoredGloss = {
      ...tiAmo,
      translation: "",
      texts: { es: "te amo", it: "ti amo" },
    };

    const sides = getVocabularyCardSides(noStoredGloss, "it", "en");

    // English is not in the row and the stored gloss is empty. A real gloss
    // in a language the reader has chosen to study beats an empty one.
    expect(sides.secondary.text).toBe("ti amo");
    expect(sides.secondary.language).toBe("it");
  });

  it("leaves the gloss empty when every side is the word's own language", () => {
    const only = {
      ...tiAmo,
      translation: "",
      translation_language: "es" as const,
      texts: { es: "te amo" },
    };

    // Nothing to gloss with. Every renderer skips a blank second side.
    expect(getVocabularyCardSides(only, "es", "es").secondary.text).toBe("");
  });
});
