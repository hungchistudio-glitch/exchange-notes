"use client";

import useTranslation from "@/hooks/i18n/useTranslation";
import { useVocabularyPage } from "@/hooks/useVocabularyPage";
import useVocabulary from "@/hooks/useVocabulary";
import useVocabularyFriendPicker from "@/hooks/useVocabularyFriendPicker";
import useVocabularyLibrary from "@/hooks/useVocabularyLibrary";
import useVocabularyLookupController from "@/hooks/useVocabularyLookupController";
import useVocabularyMutations from "@/hooks/useVocabularyMutations";
import useVocabularyStats from "@/hooks/useVocabularyStats";
import useUniqueVocabulary from "@/hooks/useUniqueVocabulary";

export default function useVocabularyController() {
  const { t } = useTranslation();

  const page = useVocabularyPage();
  const vocabulary = useVocabulary();
  const friendPicker = useVocabularyFriendPicker();

  const lookup = useVocabularyLookupController({
    query: page.query,
    items: vocabulary.items,
    addItem: vocabulary.addItem,
    setError: vocabulary.setError,
    setQuery: page.setQuery,
    setAiSearchOpen: page.setAiSearchOpen,
    messages: {
      loginRequired: t.capture.errors.loginBeforeSave,
      duplicate: t.capture.errors.duplicateWord,
      saveFailed: t.capture.errors.saveWord,
    },
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
    /*
     * Grouped API
     *
     * New consumers should access values through their owning module:
     * controller.page.query
     * controller.vocabulary.items
     * controller.lookup.lookupStatus
     */
    page,
    vocabulary,
    friendPicker,
    lookup,
    mutations,
    stats,
    library,
    uniqueItems,

    /*
     * Temporary compatibility API
     *
     * Keep the existing flattened fields while useVocabularyPage is
     * migrated incrementally. Remove this section after all consumers
     * use the grouped API.
     */
    ...page,
    ...vocabulary,
    ...friendPicker,
    ...lookup,
    ...mutations,
    ...stats,
    ...library,
  };
}
