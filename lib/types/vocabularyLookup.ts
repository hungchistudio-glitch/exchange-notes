import type { VocabularyCategory } from "@/lib/types/app";

export type VocabularyLookupStatus =
  | "idle"
  | "loading"
  | "error"
  | "result";

export type VocabularyLookupResult = {
  englishName: string;
  chineseName: string;
  partOfSpeech: string;
  englishExample: string;
  chineseExample: string;
  confidence: "high" | "medium" | "low";
  category: VocabularyCategory;
};

/**
 * What the offline dictionary can answer on its own, with no model call.
 * Example sentences are absent by design: the offline index fabricates them,
 * so the UI shows a skeleton there until the real lookup lands.
 */
export type VocabularyLookupPreview = {
  englishName: string;
  chineseName: string;
  partOfSpeech: string;
  category: VocabularyCategory;
};

/**
 * Shared by the model response parser and the shared lookup cache. Rows read
 * back from the cache are re-validated with this rather than trusted, so a
 * row written by an older result shape is discarded instead of served.
 */
export function isVocabularyLookupResult(
  value: unknown,
): value is VocabularyLookupResult {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  const stringFields = [
    "englishName",
    "chineseName",
    "partOfSpeech",
    "englishExample",
    "chineseExample",
  ];

  return (
    stringFields.every(
      (field) =>
        typeof candidate[field] === "string" &&
        (candidate[field] as string).trim().length > 0,
    ) &&
    ["high", "medium", "low"].includes(String(candidate.confidence)) &&
    ["people", "objects", "actions", "other"].includes(String(candidate.category))
  );
}
