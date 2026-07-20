"use client";

import { useVocabularyPage } from "@/hooks/useVocabularyPage";
import useVocabulary from "@/hooks/useVocabulary";
import useVocabularyFriendPicker from "@/hooks/useVocabularyFriendPicker";
import useVocabularyLookupController from "@/hooks/useVocabularyLookupController";
import useVocabularyMutations from "@/hooks/useVocabularyMutations";
import useVocabularyStats from "@/hooks/useVocabularyStats";
import useUniqueVocabulary from "@/hooks/useUniqueVocabulary";
import useVocabularyLibrary from "@/hooks/useVocabularyLibrary";

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

  const mutations = useVocabularyMutations({
    items: vocabulary.items,
    setItems: vocabulary.setItems,
    setError: vocabulary.setError,
  });

  const uniqueItems = useUniqueVocabulary(vocabulary.items);
  const library = useVocabularyLibrary(uniqueItems);
  const stats = useVocabularyStats(uniqueItems);

  return {
    ...page,
    ...vocabulary,
    ...friendPicker,
    ...lookup,
    ...mutations,
    ...stats,
    uniqueItems,
    ...library,
  };
}
