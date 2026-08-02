import type { ClassifiedVocabulary } from "@/lib/vocabulary/classify";
import {
  deleteVocabulary,
  getCurrentUser,
  insertVocabulary,
  updateVocabularyStatus,
  vocabularyExists,
} from "@/lib/vocabulary/repository";
import { recordInteraction } from "@/lib/vocabulary/helpers";
import type { VocabularyItem } from "@/lib/types/app";

type SaveClassifiedVocabularyResult = {
  item: VocabularyItem | null;
  duplicate: boolean;
};

export async function saveClassifiedVocabulary(
  classified: ClassifiedVocabulary,
  fallbackText: string,
): Promise<SaveClassifiedVocabularyResult> {
  const { user } = await getCurrentUser();

  if (!user) {
    throw new Error("Please log in before saving a word.");
  }

  const word = (classified.englishName || fallbackText).trim();
  const translation = classified.chineseName.trim();

  const duplicate = await vocabularyExists(
    user.id,
    word,
    translation,
  );

  if (duplicate) {
    return {
      item: null,
      duplicate: true,
    };
  }

  const inserted = await insertVocabulary({
    user_id: user.id,
    word,
    translation,
    language: "english",
    part_of_speech:
      classified.partOfSpeech?.trim() || null,
    example_sentence:
      classified.englishExample?.trim() || null,
    translated_example:
      classified.chineseExample?.trim() || null,
    confidence: classified.confidence,
    category: classified.category,
    status: "new",
  });

  return {
    item: inserted as VocabularyItem,
    duplicate: false,
  };
}

export async function changeVocabularyStatus(
  item: VocabularyItem,
  status: VocabularyItem["status"],
) {
  await updateVocabularyStatus(item.id, status);

  recordInteraction(item, "status");

  return {
    ...item,
    status,
  };
}

export async function removeVocabularyItem(
  item: VocabularyItem,
) {
  await deleteVocabulary(item.id);

  return item.id;
}
