import { describe, expect, it } from "vitest";

import { lexiconCacheKey } from "@/lib/lexicon/cache";

/*
 * A lookup is a card, not a fact.
 *
 * "mow" answered while learning French is *tondre*; the same three letters
 * answered while learning English are an English headword. Keyed on the query
 * alone — which is what this cache did — the first card was handed back to a
 * reader who had switched languages, and stayed there for the ninety days of
 * the entry's life. Both server caches were already keyed by the pair; this is
 * the layer closest to the reader catching up.
 */
describe("lexiconCacheKey", () => {
  it("separates the same word in different learning languages", () => {
    expect(lexiconCacheKey({ query: "mow", pair: ["fr", "en"] })).not.toBe(
      lexiconCacheKey({ query: "mow", pair: ["en", "zh-TW"] }),
    );
  });

  it("separates the same headword glossed in different languages", () => {
    // Same word being learned, different support language: a French learner
    // reading the app in English is asking for a different card than the same
    // learner reading it in Chinese.
    expect(lexiconCacheKey({ query: "mow", pair: ["fr", "en"] })).not.toBe(
      lexiconCacheKey({ query: "mow", pair: ["fr", "zh-TW"] }),
    );
  });

  it("separates readers whose first language changes the question", () => {
    // 爸爸 asked by a Chinese speaker studying French is a request for *papa*;
    // asked by a Spanish speaker studying French it is a request for what 爸爸
    // means. Same pair, different cards — so not the same cache entry.
    expect(
      lexiconCacheKey({ query: "爸爸", pair: ["fr", "en"], native: "zh-TW" }),
    ).not.toBe(
      lexiconCacheKey({ query: "爸爸", pair: ["fr", "en"], native: "es" }),
    );
  });

  it("separates a requested headword language from an unasked one", () => {
    // "Show me this in Italian" is a different question about the same eight
    // letters, and serving one reader's choice to the next reader is the same
    // class of bug as ignoring the pair.
    expect(
      lexiconCacheKey({ query: "solo", pair: ["fr", "en"], head: "it" }),
    ).not.toBe(lexiconCacheKey({ query: "solo", pair: ["fr", "en"] }));
  });

  it("still folds away the differences that are not differences", () => {
    const canonical = lexiconCacheKey({ query: "mow", pair: ["en", "zh-TW"] });

    expect(lexiconCacheKey({ query: "  MOW  ", pair: ["en", "zh-TW"] })).toBe(
      canonical,
    );
    expect(lexiconCacheKey({ query: "Mow", pair: ["en", "zh-TW"] })).toBe(
      canonical,
    );
    expect(lexiconCacheKey({ query: "mow\tmow", pair: ["en", "zh-TW"] })).toBe(
      lexiconCacheKey({ query: "mow mow", pair: ["en", "zh-TW"] }),
    );
  });

  it("keeps the pair readable in the key, learning side first", () => {
    // Not cosmetic: the order is the app's one answer to "which side is the
    // headword", and a key that reversed it would collide two real pairs.
    expect(lexiconCacheKey({ query: "mow", pair: ["fr", "en"] })).toBe(
      "fr>en:mow",
    );
    expect(lexiconCacheKey({ query: "mow", pair: ["en", "fr"] })).toBe(
      "en>fr:mow",
    );
  });
});
