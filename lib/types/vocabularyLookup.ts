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
