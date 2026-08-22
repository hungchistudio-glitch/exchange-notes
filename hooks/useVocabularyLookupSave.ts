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

      const { data: inserted, error: insertError } = await supabase
        .from("vocabulary_items")
        .insert({
          user_id: user.id,
          word,
          translation,
          word_language: languagePair[0],
          translation_language: languagePair[1],
          part_of_speech: lookupResult.partOfSpeech.trim() || null,
          example_sentence: lookupResult.englishExample.trim() || null,
          translated_example: lookupResult.chineseExample.trim() || null,
          confidence: lookupResult.confidence,
          category: lookupResult.category,
          status: "new",
        })
        .select()
        .single();

      if (insertError || !inserted) {
        console.error("Unable to save vocabulary lookup result:", insertError);
        setError(messages.saveFailed);
        return;
      }

      addItem(inserted as VocabularyItem);

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
