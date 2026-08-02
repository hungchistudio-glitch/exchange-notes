import type {
  VocabularyCategory,
} from "@/lib/types/app";

export type VocabularyConfidence =
  | "high"
  | "medium"
  | "low";

export type ClassifiedVocabulary = {
  englishName: string;
  chineseName: string;
  partOfSpeech: string | null;
  englishExample: string | null;
  chineseExample: string | null;
  confidence: VocabularyConfidence;
  category: VocabularyCategory;
};

export async function classifyText(
  text: string,
): Promise<ClassifiedVocabulary> {
  const response = await fetch("/api/classify-text", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  const data = await response.json();

  if (!response.ok || "error" in data) {
    throw new Error(
      "error" in data
        ? data.error
        : "Couldn't classify the selected text.",
    );
  }

  return {
    englishName: data.englishName ?? text,
    chineseName: data.chineseName ?? "",
    partOfSpeech: data.partOfSpeech ?? null,
    englishExample: data.englishExample ?? null,
    chineseExample: data.chineseExample ?? null,
    confidence: data.confidence ?? "medium",
    category: data.category ?? "other",
  };
}
