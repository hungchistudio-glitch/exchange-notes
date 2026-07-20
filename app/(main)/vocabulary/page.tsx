"use client";

import { useVocabularyPage } from "@/hooks/useVocabularyPage";

import VocabularyHero from "@/components/vocabulary/VocabularyHero";
import VocabularyMainContent from "@/components/vocabulary/sections/VocabularyMainContent";
import VocabularyOverlays from "@/components/vocabulary/sections/VocabularyOverlays";
import AppPage from "@/components/ui/AppPage";
import { useState } from "react";
import useVocabulary from "@/hooks/useVocabulary";
import useVocabularyStats from "@/hooks/useVocabularyStats";
import useVocabularyLibrary from "@/hooks/useVocabularyLibrary";
import useUniqueVocabulary from "@/hooks/useUniqueVocabulary";
import useVisibleVocabularyItems from "@/hooks/useVisibleVocabularyItems";
import useVocabularySearchTracking from "@/hooks/useVocabularySearchTracking";
import useVocabularyRanking from "@/hooks/useVocabularyRanking";
import useVocabularyShare from "@/hooks/useVocabularyShare";
import useVocabularyLookup from "@/hooks/useVocabularyLookup";
import useVocabularyLookupSave from "@/hooks/useVocabularyLookupSave";
import useVocabularyLookupPartnerShare from "@/hooks/useVocabularyLookupPartnerShare";
import useVocabularyFriendPicker from "@/hooks/useVocabularyFriendPicker";
import useVocabularyMutations from "@/hooks/useVocabularyMutations";


import {
  normalizeVocabularyText,
  recordInteraction,
} from "@/lib/vocabulary/helpers";
import type {
  VocabularyItem,
  VocabularyStatus,
} from "@/lib/types/app";

export default function VocabularyPage() {
  const {
    sortMode,
    setSortMode,
    sortOpen,
    setSortOpen,
    filtersOpen,
    setFiltersOpen,
    aiSearchOpen,
    setAiSearchOpen,
  } = useVocabularyPage();
  const { items, setItems, learningLanguage, loading, error, setError } =
    useVocabulary();

  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<"all" | VocabularyStatus>(
    "all",
  );

  const {
    lookupStatus,
    lookupResult,
    lookupError,
    lookupWord,
    resetLookup,
  } = useVocabularyLookup(query);

  const {
    savingLookup,
    saveLookupResult,
  } = useVocabularyLookupSave({
    items,
    lookupResult,
    setItems,
    setError,
    setQuery,
    setAiSearchOpen,
    resetLookup,
  });

  const {
    friendPickerItem,
    friends,
    friendsLoading,
    friendsError,
    sendingFriendId,
    handleSendToPartner,
    loadFriends,
    retryFriends,
    handleClosePicker,
    handlePickFriend,
  } = useVocabularyFriendPicker();

  const uniqueItems = useUniqueVocabulary(items);

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

  const {
    filterSearch,
    setFilterSearch,
    alphabetizedItems,
    clearFilterSearch,
  } = useVocabularyLibrary(uniqueItems);

  const {
    updatingId,
    changeStatus,
    deleteVocabularyItem,
  } = useVocabularyMutations({
    items,
    setItems,
    setError,
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

  const {
    lookupCopied,
    shareLookupResult,
  } = useVocabularyShare(lookupResult);

  const {
    sendLookupToPartner,
  } = useVocabularyLookupPartnerShare({
    lookupResult,
    onSendToPartner: handleSendToPartner,
  });

  const {
    totalWords,
    learningWords,
    masteredWords,
    dailyGoal,
    dailyProgress,
    quickFilters,
  } = useVocabularyStats(uniqueItems);

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
