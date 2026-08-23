import { describe, expect, it } from "vitest";

import { getLookupCacheKey } from "@/hooks/useVocabularyLookup";

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
describe("getLookupCacheKey", () => {
  it("separates the same word in different learning languages", () => {
    expect(getLookupCacheKey("mow", ["fr", "en"])).not.toBe(
      getLookupCacheKey("mow", ["en", "zh-TW"]),
    );
  });

  it("separates the same headword glossed in different languages", () => {
    // Same word being learned, different support language: a French learner
    // reading the app in English is asking for a different card than the same
    // learner reading it in Chinese.
    expect(getLookupCacheKey("mow", ["fr", "en"])).not.toBe(
      getLookupCacheKey("mow", ["fr", "zh-TW"]),
    );
  });

  it("still folds away the differences that are not differences", () => {
    const canonical = getLookupCacheKey("mow", ["en", "zh-TW"]);

    expect(getLookupCacheKey("  MOW  ", ["en", "zh-TW"])).toBe(canonical);
    expect(getLookupCacheKey("Mow", ["en", "zh-TW"])).toBe(canonical);
    expect(getLookupCacheKey("mow\tmow", ["en", "zh-TW"])).toBe(
      getLookupCacheKey("mow mow", ["en", "zh-TW"]),
    );
  });

  it("keeps the pair readable in the key, learning side first", () => {
    // Not cosmetic: the order is the app's one answer to "which side is the
    // headword", and a key that reversed it would collide two real pairs.
    expect(getLookupCacheKey("mow", ["fr", "en"])).toBe("fr>en:mow");
    expect(getLookupCacheKey("mow", ["en", "fr"])).toBe("en>fr:mow");
  });
});
