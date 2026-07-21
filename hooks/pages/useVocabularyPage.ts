"use client";

import type { ComponentProps } from "react";

import VocabularyHero from "@/components/vocabulary/VocabularyHero";
import VocabularyMainContent from "@/components/vocabulary/sections/VocabularyMainContent";
import VocabularyOverlays from "@/components/vocabulary/sections/VocabularyOverlays";
import VocabularySearchSection from "@/components/vocabulary/sections/VocabularySearchSection";
import VocabularyList from "@/components/vocabulary/VocabularyList";

import useVocabularyController from "@/hooks/controllers/useVocabularyController";
import useVocabularyRanking from "@/hooks/useVocabularyRanking";
import useVocabularySearchTracking from "@/hooks/useVocabularySearchTracking";
import useVisibleVocabularyItems from "@/hooks/useVisibleVocabularyItems";

import { recordInteraction } from "@/lib/vocabulary/helpers";

export default function useVocabularyPage() {
  const {
    query,
    setQuery,
    quickFilter,
    setQuickFilter,
    sortMode,
    setSortMode,
    sortOpen,
    setSortOpen,
    filtersOpen,
    setFiltersOpen,
    aiSearchOpen,
    setAiSearchOpen,

    learningLanguage,
    loading,
    error,

    friendPickerItem,
    friends,
    friendsLoading,
    friendsError,
    sendingFriendId,
    handleSendToPartner,
    retryFriends,
    handleClosePicker,
    handlePickFriend,

    lookupStatus,
    lookupResult,
    lookupError,
    lookupWord,
    resetLookup,
    savingLookup,
    saveLookupResult,
    lookupCopied,
    shareLookupResult,
    sendLookupToPartner,

    updatingId,
    changeStatus,

    totalWords,
    learningWords,
    masteredWords,
    dailyGoal,
    dailyProgress,
    reviewStats,
    quickFilters,
    uniqueItems,

    filterSearch,
    setFilterSearch,
    alphabetizedItems,
    clearFilterSearch,
  } = useVocabularyController();

  const { rankedIds, rankingLoading, rankingError } =
    useVocabularyRanking({
      items: uniqueItems,
      query,
      sortMode,
    });

  useVocabularySearchTracking(uniqueItems, query);

  const visibleItems = useVisibleVocabularyItems({
    items: uniqueItems,
    query,
    quickFilter,
    sortMode,
    rankedIds,
  });

  function openAiSearch() {
    setQuery("");
    resetLookup();
    setAiSearchOpen(true);
  }

  function closeAiSearch() {
    setAiSearchOpen(false);
    setQuery("");
    resetLookup();
  }

  const heroProps = {
    todayProgress: dailyProgress,
    todayGoal: dailyGoal,
    totalWords,
    learningWords,
    masteredWords,
    dueToday: reviewStats.due,
    accuracy: reviewStats.accuracy,
    retention: reviewStats.retention,
    weakWords: reviewStats.weak,
  } satisfies ComponentProps<typeof VocabularyHero>;

  const searchProps = {
    totalWords,
    learningWords,
    masteredWords,
    query,
    quickFilter,
    quickFilters,
    visibleCount: visibleItems.length,
    sortMode,
    rankingLoading,
    rankingError,

    onQueryChange: (value: string) => {
      setQuery(value);
      resetLookup();
    },

    onClear: () => {
      setQuery("");
      resetLookup();
    },

    onOpenAI: openAiSearch,
    onQuickFilterChange: setQuickFilter,
    onOpenSort: () => setSortOpen(true),
    onOpenLibrary: () => setFiltersOpen(true),
  } satisfies ComponentProps<typeof VocabularySearchSection>;

  const listProps = {
    loading,
    totalItemCount: totalWords,
    items: visibleItems,
    query,
    updatingId,
    lookupStatus,
    lookupResult,
    lookupError,
    savingLookup,
    onLookupWord: lookupWord,
    onSaveLookupResult: saveLookupResult,
    onChangeStatus: changeStatus,
    onSendToPartner: handleSendToPartner,
    onInteract: recordInteraction,
  } satisfies ComponentProps<typeof VocabularyList>;

  const mainContentProps = {
    error,
    searchProps,
    listProps,
  } satisfies ComponentProps<typeof VocabularyMainContent>;

  const overlaysProps = {
    lookupProps: {
      open: aiSearchOpen,
      onClose: closeAiSearch,
      query,
      setQuery,
      lookupStatus,
      lookupResult,
      lookupError,
      savingLookup,
      lookupCopied,
      onLookupWord: () => void lookupWord(),
      onSave: () => void saveLookupResult(),
      onShare: () => void shareLookupResult(),
      onSend: () => void sendLookupToPartner(),
    },

    sortOpen,
    sortProps: {
      value: sortMode,
      onClose: () => setSortOpen(false),
      onChange: (mode) => {
        setSortMode(mode);
        setSortOpen(false);
      },
    },

    filtersOpen,
    filterProps: {
      items: alphabetizedItems,
      search: filterSearch,
      onSearchChange: setFilterSearch,

      onClose: () => {
        setFiltersOpen(false);
        clearFilterSearch();
      },

      onSelect: (item) => {
        resetLookup();
        setQuery(item.word);
        setFiltersOpen(false);
        clearFilterSearch();
      },
    },

    friendPickerOpen: Boolean(friendPickerItem),
    friendPickerProps: {
      friends,
      loading: friendsLoading,
      errorMessage: friendsError,
      sendingFriendId,
      onClose: handleClosePicker,
      onPick: handlePickFriend,
      onRetry: retryFriends,
    },
  } satisfies ComponentProps<typeof VocabularyOverlays>;

  return {
    heroProps,
    mainContentProps,
    overlaysProps,
    learningLanguage,
  };
}
