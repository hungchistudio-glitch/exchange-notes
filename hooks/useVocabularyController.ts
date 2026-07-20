"use client";

import { useVocabularyPage } from "@/hooks/useVocabularyPage";
import useVocabulary from "@/hooks/useVocabulary";
import useVocabularyFriendPicker from "@/hooks/useVocabularyFriendPicker";

export default function useVocabularyController() {
  const page = useVocabularyPage();
  const vocabulary = useVocabulary();
  const friendPicker = useVocabularyFriendPicker();

  return {
    ...page,
    ...vocabulary,
    ...friendPicker,
  };
}
