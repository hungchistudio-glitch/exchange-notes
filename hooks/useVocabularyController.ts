"use client";

import { useVocabularyPage } from "@/hooks/useVocabularyPage";
import useVocabulary from "@/hooks/useVocabulary";
import useVocabularyFriendPicker from "@/hooks/useVocabularyFriendPicker";
import useVocabularyLookupController from "@/hooks/useVocabularyLookupController";

export default function useVocabularyController() {
  const page = useVocabularyPage();
  const vocabulary = useVocabulary();
  const friendPicker = useVocabularyFriendPicker();

  const lookup = useVocabularyLookupController({
    query: page.query,
    items: vocabulary.items,
    setItems: vocabulary.setItems,
    setError: vocabulary.setError,
    setQuery: page.setQuery,
    setAiSearchOpen: page.setAiSearchOpen,
    onSendToPartner: friendPicker.handleSendToPartner,
  });

  return {
    ...page,
    ...vocabulary,
    ...friendPicker,
    ...lookup,
  };
}
