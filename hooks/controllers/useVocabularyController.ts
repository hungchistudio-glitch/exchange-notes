"use client";

import { useVocabularyPage } from "@/hooks/useVocabularyPage";
import useVocabulary from "@/hooks/useVocabulary";
import useVocabularyFriendPicker from "@/hooks/useVocabularyFriendPicker";
import useVocabularyLibrary from "@/hooks/useVocabularyLibrary";
import useVocabularyMutations from "@/hooks/useVocabularyMutations";
import useVocabularyStats from "@/hooks/useVocabularyStats";
import useUniqueVocabulary from "@/hooks/useUniqueVocabulary";

/*
 * The lookup used to live here too — its own hook, its own save path, its own
 * duplicate check, wired into this screen's list and error banner. It is gone:
 * looking a word up is an app-level capability now (contexts/
 * LexiconSearchContext), and this screen asks for it the same way the dock and
 * the home screen do. What is left in this controller is the library itself,
 * which is what it was always for.
 */
export default function useVocabularyController() {
  const page = useVocabularyPage();
  const vocabulary = useVocabulary();
  const friendPicker = useVocabularyFriendPicker();

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
     */
    page,
    vocabulary,
    friendPicker,
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
    ...mutations,
    ...stats,
    ...library,
  };
}
