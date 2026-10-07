/** Obvious low-level news labels, not a claim to certify a word's CEFR level. */
export const BASIC_NEWS_TERMS = new Set([
  "art", "artist", "museum", "technology", "computer", "fashion", "clothes",
  "design", "news", "business", "people", "company", "market", "country",
  "national", "international", "index", "inflation", "connector", "software",
  "hardware", "science", "research", "government", "exhibition", "collection",
  "style", "brand", "product", "price", "growth", "change", "new", "important",
  "beautiful", "popular", "modern", "digital", "consumer", "retail", "economic",
  "headline", "statistics", "misuse", "misusing", "year-on-year",
  "collaboration", "collaborate", "staple", "staples", "recognition",
  "horizontal", "vertical", "redevelopment", "inventory", "partnership",
  "innovation", "influence", "inspiration", "opportunity", "sustainable",
  "sustainability", "traditional", "contemporary", "authentic", "original",
  "wardrobe", "revolve", "appreciation", "compelling", "silhouette", "silhouettes",
  "subsequent", "endure", "bizarre", "resilience", "detain", "condemn",
]);

/** Reject filler and repeated English terms without spending another AI call. */
export function hasAdvancedVocabularyDiversity(words: readonly string[]): boolean {
  const normalized = words.map(word => word.normalize("NFKC").trim().toLowerCase().replace(/[.!?,;:]+$/g, ""));
  return normalized.length === 3 && new Set(normalized).size === 3 &&
    normalized.every(word => word.length > 0 && !BASIC_NEWS_TERMS.has(word));
}

/** Typography may differ, but the quoted words must still occur together. */
export function isNewsSourceAnchor(anchor: string, source: string): boolean {
  const normalize = (text: string) => text.normalize("NFKC").toLowerCase()
    .replace(/["'“”‘’]/g, "").replace(/\s+/g, " ").trim();
  const normalizedAnchor = normalize(anchor);
  return normalizedAnchor.length >= 8 && anchor.length <= 120 && normalize(source).includes(normalizedAnchor);
}
