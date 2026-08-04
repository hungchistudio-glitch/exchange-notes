export type PartOfSpeechKey =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "pronoun"
  | "preposition"
  | "conjunction"
  | "interjection"
  | "phrase"
  | "other";

/**
 * Normalizes a free-text part-of-speech label (from stored vocabulary data,
 * which may use abbreviations or inconsistent casing/spacing) into one of
 * the canonical PartOfSpeechKey values used for display grouping/badges.
 * Previously duplicated verbatim in VocabularyCardHeader.tsx and
 * VocabularyHeader.tsx.
 */
export function normalizePartOfSpeech(value: string): PartOfSpeechKey {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const aliases: Record<string, PartOfSpeechKey> = {
    noun: "noun",
    verb: "verb",
    adjective: "adjective",
    adj: "adjective",
    adverb: "adverb",
    adv: "adverb",
    pronoun: "pronoun",
    preposition: "preposition",
    conjunction: "conjunction",
    interjection: "interjection",
    phrase: "phrase",
  };

  return aliases[normalized] ?? "other";
}
