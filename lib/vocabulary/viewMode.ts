export type VocabularyViewMode = "cards" | "compact";

export const VOCABULARY_VIEW_STORAGE_KEY =
  "exchange-notes:vocabulary-view-mode";

export function isVocabularyViewMode(
  value: string | null,
): value is VocabularyViewMode {
  return value === "cards" || value === "compact";
}
