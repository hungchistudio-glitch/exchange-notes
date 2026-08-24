"use client";

import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { createClient } from "@/lib/supabase/client";
import type { VocabularyItem } from "@/lib/types/app";
import type { VocabularyLookupResult } from "@/lib/types/vocabularyLookup";
import { createVocabularyEntry } from "@/lib/vocabulary/createEntry";
import { getVocabularyKey } from "@/lib/vocabulary/helpers";

export type VocabularyLookupSaveMessages = {
  loginRequired: string;
  duplicate: string;
  saveFailed: string;
};

type UseVocabularyLookupSaveOptions = {
  items: VocabularyItem[];
  lookupResult: VocabularyLookupResult | null;

  addItem: (item: VocabularyItem) => void;
  setError: Dispatch<SetStateAction<string>>;
  setQuery: Dispatch<SetStateAction<string>>;
  setAiSearchOpen: Dispatch<SetStateAction<boolean>>;

  resetLookup: () => void;
  messages: VocabularyLookupSaveMessages;
};

export default function useVocabularyLookupSave({
  items,
  lookupResult,
  addItem,
  setError,
  setQuery,
  setAiSearchOpen,
  resetLookup,
  messages,
}: UseVocabularyLookupSaveOptions) {
  const { languagePair } = useLearningLanguageContext();

  const [savingLookup, setSavingLookup] = useState(false);

  const saveLookupResult = useCallback(async () => {
    if (!lookupResult || savingLookup) return;

    setSavingLookup(true);
    setError("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Unable to read the current user while saving vocabulary:",
          userError,
        );
        setError(messages.saveFailed);
        return;
      }

      if (!user) {
        setError(messages.loginRequired);
        return;
      }

      const word = lookupResult.englishName.trim();
      const translation = lookupResult.chineseName.trim();
      const candidateKey = getVocabularyKey(word, translation);

      const duplicateExists = items.some(
        (item) =>
          getVocabularyKey(item.word, item.translation) === candidateKey,
      );

      if (duplicateExists) {
        setError(messages.duplicate);
        resetLookup();
        setQuery("");
        return;
      }

      /*
       * Through the shared pipeline rather than straight at the table.
       *
       * This wrote its own insert, which meant it decided its own language
       * metadata — and, less visibly, that a word looked up on a train was
       * simply lost, because the outbox only ever saw writes that went
       * through the repository.
       */
      const { item: inserted } = await createVocabularyEntry({
        userId: user.id,
        term: word,
        translation,
        partOfSpeech: lookupResult.partOfSpeech,
        termExample: lookupResult.englishExample,
        translationExample: lookupResult.chineseExample,
        confidence: lookupResult.confidence,
        category: lookupResult.category,
        status: "new",
        language: {
          pair: languagePair,
          stated: { term: languagePair[0], translation: languagePair[1] },
          ai: {
            termLanguage: lookupResult.termLanguage,
            translationLanguage: lookupResult.translationLanguage,
          },
        },
      });

      addItem(inserted);

      resetLookup();
      setQuery("");
      setAiSearchOpen(false);
    } catch (saveError) {
      console.error("Unexpected vocabulary lookup save failure:", saveError);
      setError(messages.saveFailed);
    } finally {
      setSavingLookup(false);
    }
  }, [
    addItem,
    items,
    lookupResult,
    messages,
    resetLookup,
    savingLookup,
    setAiSearchOpen,
    setError,
    setQuery,
    languagePair,
  ]);

  return {
    savingLookup,
    saveLookupResult,
  };
}
