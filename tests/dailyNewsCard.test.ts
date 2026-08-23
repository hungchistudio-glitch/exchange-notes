import { describe, expect, it } from "vitest";

import { readDailyNewsCard } from "@/lib/types/dailyNews";

/*
 * The pool holds cards in two shapes at once — 69 written before the
 * language moved out of the field names, and a growing number written after
 * — and both have to survive the trip out of the database.
 */

const legacyCard = {
  id: "https://example.com/a",
  category: "Society",
  englishTitle: "Prisons",
  chineseTitle: "監獄",
  englishSummary: "A long enough English summary to be real.",
  chineseSummary: "夠長的中文摘要。",
  englishCaption: "A caption",
  chineseCaption: "圖說",
  sourceName: "The Guardian",
  sourceUrl: "https://example.com/a",
  publishedAt: "2026-08-21T00:00:00Z",
  imageUrl: null,
  vocabulary: [
    {
      word: "prison",
      translation: "監獄",
      partOfSpeech: "noun",
      englishExample: "The prison is full.",
      chineseExample: "監獄滿了。",
    },
  ],
};

const multilingualCard = {
  id: "https://example.com/b",
  category: "Society",
  titles: { en: "Prisons", es: "Prisiones", "zh-TW": "監獄" },
  summaries: {
    en: "A long enough English summary to be real.",
    es: "Un resumen en español lo bastante largo.",
    "zh-TW": "夠長的中文摘要。",
  },
  captions: { en: "A caption", es: "Un pie de foto", "zh-TW": "圖說" },
  sourceName: "The Guardian",
  sourceUrl: "https://example.com/b",
  publishedAt: "2026-08-22T00:00:00Z",
  imageUrl: null,
  vocabulary: [
    {
      texts: { en: "prison", es: "prisión", "zh-TW": "監獄" },
      partOfSpeech: "noun",
      examples: {
        en: "The prison is full.",
        es: "La prisión está llena.",
        "zh-TW": "監獄滿了。",
      },
    },
  ],
};

describe("readDailyNewsCard", () => {
  it("keeps the vocabulary of a card written in the old shape", () => {
    const card = readDailyNewsCard(legacyCard);

    expect(card?.vocabulary).toHaveLength(1);
    expect(card?.vocabulary[0].texts).toEqual({ en: "prison", "zh-TW": "監獄" });
    expect(card?.vocabulary[0].examples.en).toBe("The prison is full.");
  });

  it("keeps the vocabulary of a card written in the language-keyed shape", () => {
    // The regression: this used to require `word` and `translation` to be
    // strings before it would look at the item, so every word on every
    // multilingual card was dropped and Discover's key-word list came up
    // empty on exactly the cards generated in the reader's own language.
    const card = readDailyNewsCard(multilingualCard);

    expect(card?.vocabulary).toHaveLength(1);
    expect(card?.vocabulary[0].texts.es).toBe("prisión");
    expect(card?.vocabulary[0].examples.es).toBe("La prisión está llena.");
  });

  it("carries a Spanish story and its Spanish words together", () => {
    const card = readDailyNewsCard(multilingualCard);

    // The two travel as one. A title that speaks Spanish beside vocabulary
    // that does not is the exact state this test exists to prevent.
    expect(card?.titles.es).toBeTruthy();
    expect(card?.vocabulary[0].texts.es).toBeTruthy();
  });

  it("drops a word it cannot name in any language", () => {
    const card = readDailyNewsCard({
      ...multilingualCard,
      vocabulary: [
        { partOfSpeech: "noun", examples: { en: "Nothing to see." } },
        multilingualCard.vocabulary[0],
      ],
    });

    expect(card?.vocabulary).toHaveLength(1);
  });

  it("still refuses a card with no title at all", () => {
    expect(readDailyNewsCard({ ...multilingualCard, titles: {} })).toBeNull();
    expect(readDailyNewsCard(null)).toBeNull();
  });
});
