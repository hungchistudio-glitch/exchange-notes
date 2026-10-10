"use client";

import { useVocabularyPage } from "@/hooks/useVocabularyPage";
import useVocabulary from "@/hooks/useVocabulary";
import useVocabularyFriendPicker from "@/hooks/useVocabularyFriendPicker";
import useVocabularyLibrary from "@/hooks/useVocabularyLibrary";
import useVocabularyMutations from "@/hooks/useVocabularyMutations";
import useVocabularyStats from "@/hooks/useVocabularyStats";

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

  /*
   * Every saved card, the same rows Home and Review count. The library used
   * to fold cards with the same word and translation into one, so it read
   * 496 words while Home read 510 for the same account. Two cards with the
   * same text are still two cards the reader saved — each has its own
   * status, notes and review history — and hiding one also hid it from
   * search, the status filters and the language counts.
   */
  const library = useVocabularyLibrary(vocabulary.items);
  const stats = useVocabularyStats(vocabulary.items);

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
