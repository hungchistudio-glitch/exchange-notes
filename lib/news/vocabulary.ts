/** Obvious low-level news labels, not a claim to certify a word's CEFR level. */
export const BASIC_NEWS_TERMS = new Set([
  "art", "artist", "museum", "technology", "computer", "fashion", "clothes",
  "design", "news", "business", "people", "company", "market", "country",
  "national", "international", "index", "inflation", "connector", "software",
  "hardware", "science", "research", "government", "exhibition", "collection",
  "style", "brand", "product", "price", "growth", "change", "new", "important",
  "beautiful", "popular", "modern", "digital", "consumer", "retail", "economic",
  "headline", "statistics", "misuse", "misusing", "year-on-year",
]);

/** Difficulty anchors, used only when the article supports the same concept. */
export const C2_EDITORIAL_ANCHORS = `
Contemporary art: iconoclasm, recontextualisation, curatorial conceit,
  aesthetic austerity, formal rigour, intertextuality, subversive undercurrents.
Technology: circumvention, surreptitious access, unfettered discretion,
  interoperability, exfiltration, algorithmic opacity, tacit acquiescence.
Fashion: sartorial subversion, artisanal provenance, ostentatious opulence,
  aesthetic eclecticism, commodification, vestimentary codes, meticulous tailoring.
Economic / general analysis: inflationary headwinds, fiscal retrenchment,
  market consolidation, structural asymmetries, macroeconomic volatility,
  intransigence, institutional inertia, entrenched orthodoxy.`.trim();

/** Reject filler and repeated English terms without spending another AI call. */
export function hasAdvancedVocabularyDiversity(words: readonly string[]): boolean {
  const normalized = words.map(word => word.normalize("NFKC").trim().toLowerCase().replace(/[.!?,;:]+$/g, ""));
  return normalized.length === 3 && new Set(normalized).size === 3 &&
    normalized.every(word => word.length > 0 && !BASIC_NEWS_TERMS.has(word));
}
