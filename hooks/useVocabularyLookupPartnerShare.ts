"use client";

import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import { useCallback } from "react";

import { createClient } from "@/lib/supabase/client";
import type { VocabularyItem } from "@/lib/types/app";
import type { VocabularyLookupResult } from "@/lib/types/vocabularyLookup";

type UseVocabularyLookupPartnerShareOptions = {
  lookupResult: VocabularyLookupResult | null;
  onSendToPartner: (item: VocabularyItem) => void;
};

export default function useVocabularyLookupPartnerShare({
  lookupResult,
  onSendToPartner,
}: UseVocabularyLookupPartnerShareOptions) {
  const { languagePair } = useLearningLanguageContext();

  const sendLookupToPartner = useCallback(async () => {
    if (!lookupResult) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const now = new Date().toISOString();

    const item: VocabularyItem = {
      id: `ai-search-${crypto.randomUUID()}`,
      user_id: user?.id ?? "",
      word: lookupResult.englishName,
      translation: lookupResult.chineseName,
      language: languagePair[0],
      word_language: languagePair[0],
      translation_language: languagePair[1],
      texts: {
        [languagePair[0]]: lookupResult.englishName,
        [languagePair[1]]: lookupResult.chineseName,
      },
      examples: {
        [languagePair[0]]: lookupResult.englishExample || "",
        [languagePair[1]]: lookupResult.chineseExample || "",
      },
      part_of_speech: lookupResult.partOfSpeech || null,
      example_sentence: lookupResult.englishExample || null,
      translated_example: lookupResult.chineseExample || null,
      confidence: lookupResult.confidence,
      category: lookupResult.category,
      status: "new",
      favorite: false,
      image_url: null,
      created_at: now,
      updated_at: now,
    };

    onSendToPartner(item);
  }, [lookupResult, onSendToPartner, languagePair]);

  return {
    sendLookupToPartner,
  };
}
