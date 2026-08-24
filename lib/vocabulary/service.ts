import type { ClassifiedVocabulary } from "@/lib/vocabulary/classify";
import { createVocabularyEntry } from "@/lib/vocabulary/createEntry";
import {
  deleteVocabulary,
  getCurrentUser,
  updateVocabularyStatus,
  vocabularyExists,
} from "@/lib/vocabulary/repository";
import { recordInteraction } from "@/lib/vocabulary/helpers";
import type { LanguageCode } from "@/lib/languages";
import type { VocabularyItem } from "@/lib/types/app";

type SaveClassifiedVocabularyResult = {
  item: VocabularyItem | null;
  duplicate: boolean;
};

export async function saveClassifiedVocabulary(
  classified: ClassifiedVocabulary,
  fallbackText: string,
  /*
   * The pair the result was produced in, learning first. The classifier's two
   * fields are still named for two languages; which languages they hold is
   * decided by the prompt this pair built, so it has to travel with the
   * result rather than being guessed at the point it is saved.
   */
  languagePair: readonly [LanguageCode, LanguageCode],
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

  const { item } = await createVocabularyEntry({
    userId: user.id,
    term: word,
    translation,
    partOfSpeech: classified.partOfSpeech,
    termExample: classified.englishExample,
    translationExample: classified.chineseExample,
    confidence: classified.confidence,
    category: classified.category,
    status: "new",
    language: {
      pair: languagePair,
      /*
       * The pair is a statement, not a guess. The prompt that produced this
       * result named these two languages and told the model which field
       * holds which, so the first field is in the first language by
       * construction — there is nothing here for a detector to add.
       */
      stated: { term: languagePair[0], translation: languagePair[1] },
      /*
       * What the model said about its own output, kept as the fallback for
       * a result that reached this point without a pair — an offline
       * dictionary hit, a row served from the shared cache. The pair
       * outranks it whenever both are present.
       */
      ai: {
        termLanguage: classified.termLanguage,
        translationLanguage: classified.translationLanguage,
      },
    },
  });

  return {
    item,
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
