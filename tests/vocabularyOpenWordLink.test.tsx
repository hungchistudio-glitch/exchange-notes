import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { VocabularyItem } from "@/lib/types/app";

/* =========================================================
   "Open the saved word" has to open the word

   Four places link here — the lexicon result card, the Cosmic console,
   today's word, the search sheet — and so does the iOS widget. All of them
   say some version of "open the saved word", and the link expanded a card in
   the list and scrolled to it. What a reader got was the vocabulary page,
   with something open somewhere in it.

   Nothing covered this route at all, which is how it stayed that way. The
   assertion is on what the page hands its overlay tree: a detail item, and
   the gate that decides whether the overlay tree is even loaded.
   ========================================================= */

const WORD: VocabularyItem = {
  id: "word-1",
  word: "glasses",
  translation: "眼鏡",
  wordLanguage: "en",
  translationLanguage: "zh-TW",
  partOfSpeech: "noun",
  learningStatus: "new",
  createdAt: new Date().toISOString(),
} as unknown as VocabularyItem;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/contexts/LexiconSearchContext", () => ({
  useLexiconSearchSheet: () => ({ openSearch: vi.fn() }),
}));

vi.mock("@/hooks/controllers/useVocabularyController", () => {
  /*
   * The controller is a real hook with a database behind it. What this test
   * is about is one effect and the props it produces, so the controller is
   * the shape that effect reads and nothing else.
   */
  const noop = () => {};
  return {
    default: () => ({
      learningLanguage: "en",
      loading: false,
      error: "",
      uniqueItems: [WORD],
      updateItem: vi.fn(),
      filterSearch: "",
      setFilterSearch: noop,
      alphabetizedItems: [WORD],
      clearFilterSearch: noop,
      page: {
        query: "",
        setQuery: noop,
        quickFilter: "all",
        setQuickFilter: noop,
        languageFilter: [],
        setLanguageFilter: noop,
        languageFilterOpen: false,
        setLanguageFilterOpen: noop,
        sortMode: "new",
        setSortMode: noop,
        sortOpen: false,
        setSortOpen: noop,
        filtersOpen: false,
        setFiltersOpen: noop,
      },
      stats: {
        totalWords: 1,
        learningWords: 0,
        masteredWords: 0,
        dailyGoal: 5,
        dailyProgress: 0,
        reviewStats: { due: 0, total: 1 },
        quickFilters: [],
        languageCounts: {},
      },
      mutations: {
        updatingId: null,
        changeStatus: vi.fn(),
        deleteVocabularyItem: vi.fn(),
      },
      friendPicker: {
        friendPickerItem: null,
        friends: [],
        friendsLoading: false,
        friendsError: "",
        sendingFriendId: null,
        handleSendToPartner: vi.fn(),
        retryFriends: vi.fn(),
        handleClosePicker: vi.fn(),
        handlePickFriend: vi.fn(),
      },
    }),
  };
});

const { default: useVocabularyPage } = await import(
  "@/hooks/pages/useVocabularyPage"
);

describe("the open-word deep link", () => {
  it("opens the word's detail sheet, not just its place in the list", async () => {
    const { result } = renderHook(() =>
      useVocabularyPage({
        openWidgetWordId: "word-1",
        openWidgetWordRequestId: "nonce-1",
      }),
    );

    await waitFor(() => {
      expect(result.current.overlaysProps.detailItem?.id).toBe("word-1");
    });

    /* The overlay tree is loaded on demand, so a detail item nothing mounts
       is the same as no detail item. */
    expect(result.current.overlaysOpen).toBe(true);
  });

  it("leaves the sheet shut when no word was asked for", async () => {
    const { result } = renderHook(() => useVocabularyPage({}));

    await waitFor(() => {
      expect(result.current.overlaysProps.detailItem).toBeFalsy();
    });

    expect(result.current.overlaysOpen).toBe(false);
  });
});
