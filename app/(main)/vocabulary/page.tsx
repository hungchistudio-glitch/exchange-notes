"use client";

import useVocabularyController from "@/hooks/useVocabularyController";

import VocabularyHero from "@/components/vocabulary/VocabularyHero";
import VocabularyMainContent from "@/components/vocabulary/sections/VocabularyMainContent";
import VocabularyOverlays from "@/components/vocabulary/sections/VocabularyOverlays";
import AppPage from "@/components/ui/AppPage";
import useVisibleVocabularyItems from "@/hooks/useVisibleVocabularyItems";
import useVocabularySearchTracking from "@/hooks/useVocabularySearchTracking";
import useVocabularyRanking from "@/hooks/useVocabularyRanking";


import {
  normalizeVocabularyText,
  recordInteraction,
} from "@/lib/vocabulary/helpers";
import type {
  VocabularyItem,
} from "@/lib/types/app";

export default function VocabularyPage() {

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

    items,
    setItems,
    learningLanguage,
    loading,
    error,
    setError,

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
    deleteVocabularyItem,
    totalWords,
    learningWords,
    masteredWords,
    dailyGoal,
    dailyProgress,
    quickFilters,
    uniqueItems,
    filterSearch,
    setFilterSearch,
    alphabetizedItems,
    clearFilterSearch,
  } = useVocabularyController();


  const {
    rankedIds,
    rankingLoading,
    rankingError,
  } = useVocabularyRanking({
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
  };

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
  };

  return (
    <AppPage width="default">
      <VocabularyHero todayProgress={dailyProgress} todayGoal={dailyGoal} />

      <VocabularyMainContent
        error={error}
        searchProps={searchProps}
        listProps={listProps}
      />

      <VocabularyOverlays
        lookupProps={{
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
        }}
        sortOpen={sortOpen}
        sortProps={{
          value: sortMode,
          onClose: () => setSortOpen(false),
          onChange: (mode) => {
            setSortMode(mode);
            setSortOpen(false);
          },
        }}
        filtersOpen={filtersOpen}
        filterProps={{
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
        }}
        friendPickerOpen={Boolean(friendPickerItem)}
        friendPickerProps={{
          friends,
          loading: friendsLoading,
          errorMessage: friendsError,
          sendingFriendId,
          onClose: handleClosePicker,
          onPick: handlePickFriend,
          onRetry: retryFriends,
        }}
      />
    </AppPage>
  );
}
