import type { LexiconEntry } from "@/lib/lexicon/types";
import { removeAssets } from "@/lib/media/assets";
import { ownedPaths, readMedia } from "@/lib/media/record";
import { createClient } from "@/lib/supabase/client";
import {
  DuplicateVocabularyError,
  createVocabularyEntry,
} from "@/lib/vocabulary/createEntry";
import {
  deleteVocabulary,
  getCurrentUser,
  updateVocabularyStatus,
} from "@/lib/vocabulary/repository";
import { recordInteraction } from "@/lib/vocabulary/helpers";
import type { LanguageCode } from "@/lib/languages";
import type { VocabularyItem } from "@/lib/types/app";

type SaveClassifiedVocabularyResult = {
  item: VocabularyItem | null;
  duplicate: boolean;
};

export async function saveClassifiedVocabulary(
  entry: LexiconEntry,
  fallbackText: string,
  /*
   * The reader's pair, learning first. Not an answer about this word — the
   * answer is on the entry — but the context it was met in, which is recorded
   * on the row and is the fallback when the model said nothing usable.
   */
  languagePair: readonly [LanguageCode, LanguageCode],
): Promise<SaveClassifiedVocabularyResult> {
  const { user } = await getCurrentUser();

  if (!user) {
    throw new Error("Please log in before saving a word.");
  }

  const word = (entry.term || fallbackText).trim();
  const translation = entry.translation.trim();

  try {
    const { item } = await createVocabularyEntry({
      userId: user.id,
      term: word,
      translation,
      partOfSpeech: entry.partOfSpeech,
      termExample: entry.termExample,
      translationExample: entry.translationExample,
      confidence: entry.confidence,
      category: entry.category,
      status: "new",
      language: {
        pair: languagePair,
        /*
         * The model's answer, not the reader's pair.
         *
         * This used to state the pair outright — `stated: { term: pair[0] }` —
         * which was defensible while the prompt could only answer in those two
         * languages. It can answer in any of the five now, so stating the pair
         * would file a French word selected by an English learner as English,
         * permanently, in the one field that is never recomputed afterwards.
         */
        ai: {
          termLanguage: entry.termLanguage,
          translationLanguage: entry.translationLanguage,
        },
      },
    });

    return { item, duplicate: false };
  } catch (saveError) {
    /*
     * The duplicate check lives in createVocabularyEntry now, keyed on the
     * word *and* its language. This used to call vocabularyExists, which read
     * every row the reader owns on every save and compared on spelling alone —
     * so an Italian "come" could not be saved beside the English one.
     */
    if (saveError instanceof DuplicateVocabularyError) {
      return { item: null, duplicate: true };
    }

    throw saveError;
  }
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

  /*
   * The pictures go with the word.
   *
   * They never did before: deleting a word removed the row and left its
   * photograph in storage for ever, so every library that has ever had a
   * word deleted is carrying files nothing points at. Now that a capture
   * writes two of them, that leak would have doubled.
   *
   * After the delete, not before, and never allowed to fail the delete. A
   * file that outlives its row is litter the orphan sweep can find; a row
   * whose picture was removed first is a card with a hole in it that
   * nothing will ever repair.
   */
  const paths = ownedPaths(readMedia(item.media), item.image_url);

  if (paths.length > 0) {
    await removeAssets(createClient(), paths);
  }

  return item.id;
}
