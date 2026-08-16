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
  /**
   * The lookup reached the offline dictionary and the word was not in it, so
   * there is no translation to show — the side of the pair being translated
   * into is an empty string, as is the example that would have quoted it.
   *
   * This exists because the alternative was worse: the offline path used to
   * fill that gap with the literal string "待確認" and build a sentence around
   * it, which read as an answer. It was spoken by the audio button, given
   * pinyin and zhuyin of its own, and saved into the learner's vocabulary as
   * the word's meaning. A flag lets every surface say "not yet" instead of
   * quietly inventing one.
   *
   * Model results never set this. Neither do offline hits, which have a real
   * translation and only lack a real example.
   */
  translationUnavailable?: boolean;
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
  /** Same meaning as on the full result. */
  translationUnavailable?: boolean;
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
