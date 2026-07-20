"use client";

import { useVocabularyPage } from "@/hooks/useVocabularyPage";
import useVocabulary from "@/hooks/useVocabulary";

export default function useVocabularyController() {
  const page = useVocabularyPage();
  const vocabulary = useVocabulary();

  return {
    ...page,
    ...vocabulary,
  };
}
