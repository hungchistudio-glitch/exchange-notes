import { isLanguageCode, type LanguageCode } from "@/lib/languages";
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
  /**
   * The languages the two name fields are in, as the model reported them.
   *
   * The field names say English and Chinese for historical reasons and have
   * not meant that for some time — see buildClassifyTextPrompt, which tells
   * the model as much. These say what they actually hold.
   */
  termLanguage?: LanguageCode;
  translationLanguage?: LanguageCode;
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
    termLanguage: isLanguageCode(data.termLanguage)
      ? data.termLanguage
      : undefined,
    translationLanguage: isLanguageCode(data.translationLanguage)
      ? data.translationLanguage
      : undefined,
  };
}
