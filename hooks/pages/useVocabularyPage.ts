"use client";

import { useState, type ComponentProps } from "react";

import VocabularyMainContent from "@/components/vocabulary/sections/VocabularyMainContent";
import VocabularyOverlays from "@/components/vocabulary/sections/VocabularyOverlays";
import VocabularyList from "@/components/vocabulary/VocabularyList";

import useVocabularyController from "@/hooks/controllers/useVocabularyController";
import buildVocabularyHeroProps from "@/hooks/pages/builders/buildVocabularyHeroProps";
import buildVocabularySearchProps from "@/hooks/pages/builders/buildVocabularySearchProps";
import useVocabularyRanking from "@/hooks/useVocabularyRanking";
import useVocabularySearchTracking from "@/hooks/useVocabularySearchTracking";
import useVisibleVocabularyItems from "@/hooks/useVisibleVocabularyItems";

import { recordInteraction } from "@/lib/vocabulary/helpers";
import { updateVocabularyFields } from "@/lib/vocabulary/repository";
import type { VocabularyItem } from "@/lib/types/app";
import type { VocabularyEditValues } from "@/components/vocabulary/detail/VocabularyEditModal";

async function shareVocabularyItem(item: VocabularyItem) {
  const text = `${item.word} — ${item.translation}`;

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch {
      // User cancelled the share sheet, or it's unsupported — fall through
      // to the clipboard fallback below.
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  }
}

export default function useVocabularyPage() {
  const controller = useVocabularyController();

  const [detailItem, setDetailItem] = useState<VocabularyItem | null>(null);
  const [collectionsItem, setCollectionsItem] =
    useState<VocabularyItem | null>(null);
  const [editItem, setEditItem] = useState<VocabularyItem | null>(null);

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
  } = controller.page;

  const {
    learningLanguage,
    loading,
    error,

    uniqueItems,
    updateItem,

    filterSearch,
    setFilterSearch,
    alphabetizedItems,
    clearFilterSearch,
  } = controller;

  const {
    totalWords,
    learningWords,
    masteredWords,
    dailyGoal,
    dailyProgress,
    reviewStats,
    quickFilters,
  } = controller.stats;

  const { updatingId, changeStatus, deleteVocabularyItem } = controller.mutations;

  const {
    friendPickerItem,
    friends,
    friendsLoading,
    friendsError,
    sendingFriendId,
    handleSendToPartner,
    retryFriends,
    handleClosePicker,
    handlePickFriend,
  } = controller.friendPicker;

  const {
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
  } = controller.lookup;

  const { rankedIds, rankingLoading, rankingError } = useVocabularyRanking({
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

  const heroProps = buildVocabularyHeroProps({
    totalWords,
    learningWords,
    masteredWords,
    dailyGoal,
    dailyProgress,
    reviewStats,
  });

  const searchProps = buildVocabularySearchProps({
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
    setQuery,
    resetLookup,
    openAiSearch,
    setQuickFilter,
    setSortOpen,
    setFiltersOpen,
  });

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
    onDeleteItem: deleteVocabularyItem,
    onOpenDetail: setDetailItem,
    onOpenCollections: setCollectionsItem,
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

    detailItem,
    detailProps: {
      updating: detailItem ? updatingId === detailItem.id : false,
      onClose: () => setDetailItem(null),
      onChangeStatus: (status) => {
        if (detailItem) void changeStatus(detailItem, status);
      },
      onSendToPartner: () => {
        if (detailItem) handleSendToPartner(detailItem);
      },
      onShare: () => {
        if (detailItem) void shareVocabularyItem(detailItem);
      },
      onDelete: () => {
        if (detailItem) {
          void deleteVocabularyItem(detailItem);
          setDetailItem(null);
        }
      },
      onOpenCollections: () => {
        if (detailItem) setCollectionsItem(detailItem);
      },
      onEdit: () => {
        if (detailItem) setEditItem(detailItem);
      },
    },

    collectionsItem,
    onCloseCollections: () => setCollectionsItem(null),

    editItem,
    editProps: editItem
      ? {
          open: true,
          item: editItem,
          onClose: () => setEditItem(null),
          onSave: async (values: VocabularyEditValues) => {
            const updated = await updateVocabularyFields(editItem.id, values);
            updateItem(updated as VocabularyItem);

            if (detailItem?.id === editItem.id) {
              setDetailItem(updated as VocabularyItem);
            }
          },
        }
      : null,
  } satisfies ComponentProps<typeof VocabularyOverlays>;

  return {
    heroProps,
    mainContentProps,
    overlaysProps,
    learningLanguage,
  };
}
