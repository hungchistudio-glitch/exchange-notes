"use client";

import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { createClient } from "@/lib/supabase/client";
import { getVocabularyKey } from "@/lib/vocabulary/helpers";
import type { VocabularyItem } from "@/lib/types/app";
import type { VocabularyLookupResult } from "@/lib/types/vocabularyLookup";

type UseVocabularyLookupSaveOptions = {
  items: VocabularyItem[];
  lookupResult: VocabularyLookupResult | null;
  setItems: Dispatch<SetStateAction<VocabularyItem[]>>;
  setError: Dispatch<SetStateAction<string>>;
  setQuery: Dispatch<SetStateAction<string>>;
  setAiSearchOpen: Dispatch<SetStateAction<boolean>>;
  resetLookup: () => void;
};

export default function useVocabularyLookupSave({
  items,
  lookupResult,
  setItems,
  setError,
  setQuery,
  setAiSearchOpen,
  resetLookup,
}: UseVocabularyLookupSaveOptions) {
  const [savingLookup, setSavingLookup] = useState(false);

  const saveLookupResult = useCallback(async () => {
    if (!lookupResult || savingLookup) return;

    setSavingLookup(true);
    setError("");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Please log in before saving a word.");
      }

      const word = lookupResult.englishName.trim();
      const translation = lookupResult.chineseName.trim();
      const candidateKey = getVocabularyKey(word, translation);

      const duplicate = items.find(
        (item) =>
          getVocabularyKey(item.word, item.translation) === candidateKey,
      );

      if (duplicate) {
        setError("This word is already in your vocabulary.");
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
          language: "english",
          part_of_speech: lookupResult.partOfSpeech.trim() || null,
          example_sentence: lookupResult.englishExample.trim() || null,
          translated_example: lookupResult.chineseExample.trim() || null,
          confidence: lookupResult.confidence,
          category: lookupResult.category,
          status: "new",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setItems((current) => [
        inserted as VocabularyItem,
        ...current,
      ]);

      resetLookup();
      setQuery("");
      setAiSearchOpen(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save this word.",
      );
    } finally {
      setSavingLookup(false);
    }
  }, [
    items,
    lookupResult,
    resetLookup,
    savingLookup,
    setAiSearchOpen,
    setError,
    setItems,
    setQuery,
  ]);

  return {
    savingLookup,
    saveLookupResult,
  };
}
