"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentProps } from "react";

import VocabularyMainContent from "@/components/vocabulary/sections/VocabularyMainContent";
import VocabularyOverlays from "@/components/vocabulary/sections/VocabularyOverlays";
import VocabularyList from "@/components/vocabulary/VocabularyList";

import useVocabularyController from "@/hooks/controllers/useVocabularyController";
import buildVocabularyHeroProps from "@/hooks/pages/builders/buildVocabularyHeroProps";
import buildVocabularySearchProps from "@/hooks/pages/builders/buildVocabularySearchProps";
import useVocabularyRanking from "@/hooks/useVocabularyRanking";
import useVocabularySearchTracking from "@/hooks/useVocabularySearchTracking";
import useVisibleVocabularyItems from "@/hooks/useVisibleVocabularyItems";
import useVocabularyViewMode from "@/hooks/useVocabularyViewMode";

import { recordInteraction } from "@/lib/vocabulary/helpers";
import {
  updateVocabularyFields,
  updateVocabularyLanguage,
} from "@/lib/vocabulary/repository";
import {
  correctedLanguageIdentity,
  relabelLanguage,
} from "@/lib/vocabulary/languageIdentity";
import type { LanguageCode } from "@/lib/languages";
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

type UseVocabularyPageOptions = {
  openAddWord?: boolean;
  addWordRequestId?: string;
  openWidgetWordId?: string;
  openWidgetWordRequestId?: string;
};

export default function useVocabularyPage({
  openAddWord = false,
  addWordRequestId,
  openWidgetWordId,
  openWidgetWordRequestId,
}: UseVocabularyPageOptions = {}) {
  const router = useRouter();
  const controller = useVocabularyController({
    initialAiSearchOpen: openAddWord,
  });

  const [detailItem, setDetailItem] = useState<VocabularyItem | null>(null);
  const [collectionsItem, setCollectionsItem] =
    useState<VocabularyItem | null>(null);
  const [editItem, setEditItem] = useState<VocabularyItem | null>(null);
  const [languageItem, setLanguageItem] = useState<VocabularyItem | null>(null);
  const [savingLanguage, setSavingLanguage] = useState(false);
  // Bumped every time a vocabulary card is opened, so Yumi can react with a
  // brief curious glance — a plain counter keeps the trigger self-contained
  // (no need to track *which* card, just "something happened").
  const [cardGlancePulse, setCardGlancePulse] = useState(0);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const handledWidgetWordRequestRef = useRef<string | null>(null);
  const { viewMode, toggleViewMode } = useVocabularyViewMode();

  const {
    query,
    setQuery,
    quickFilter,
    setQuickFilter,
    languageFilter,
    setLanguageFilter,
    languageFilterOpen,
    setLanguageFilterOpen,
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
    languageCounts,
  } = controller.stats;

  const { updatingId, changeStatus, deleteVocabularyItem } = controller.mutations;

  const {
    friendPickerItem,
    friends,
    friendsLoading,
    friendsError,
    sendingFriendId,
    handleSendToPartner,
    shareCard,
    retryFriends,
    handleClosePicker,
    handlePickFriend,
  } = controller.friendPicker;

  const {
    lookupStatus,
    lookupResult,
    lookupError,
    lookupDegraded,
    lookupPreview,
    lookupWord,
    resetLookup,
    savingLookup,
    saveLookupResult,
    lookupCopied,
    shareLookupResult,
    sendLookupToPartner,
  } = controller.lookup;

  useEffect(() => {
    if (!openAddWord) return;

    setQuery("");
    resetLookup();
    setAiSearchOpen(true);
  }, [
    addWordRequestId,
    openAddWord,
    resetLookup,
    setAiSearchOpen,
    setQuery,
  ]);

  useEffect(() => {
    if (!openWidgetWordId || loading) return;

    const requestKey = `${openWidgetWordRequestId ?? "initial"}:${openWidgetWordId}`;

    if (handledWidgetWordRequestRef.current === requestKey) return;

    const matchingItem = uniqueItems.find(
      (item) => item.id === openWidgetWordId,
    );

    if (!matchingItem) return;

    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      setAiSearchOpen(false);
      resetLookup();
      setQuery("");
      setQuickFilter("all");
      setExpandedItemId(matchingItem.id);
      setCardGlancePulse((count) => count + 1);
      handledWidgetWordRequestRef.current = requestKey;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const card = document.getElementById(
            `vocabulary-card-${matchingItem.id}`,
          );
          card?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    loading,
    openWidgetWordId,
    openWidgetWordRequestId,
    resetLookup,
    setAiSearchOpen,
    setQuickFilter,
    setQuery,
    uniqueItems,
  ]);

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
    languages: languageFilter,
    sortMode,
    rankedIds,
  });

  /**
   * Applies a language the reader has corrected by hand.
   *
   * The only path in the app that changes a saved row's language, and it
   * changes nothing else: the word, its translation, its examples and its
   * whole review history are carried through untouched. What moves is the
   * label — and the map key the headword sits under, which has to follow it
   * or the row goes on claiming the word is its own translation.
   */
  async function applyLanguageCorrection(
    item: VocabularyItem,
    language: LanguageCode,
  ) {
    if (savingLanguage) return;

    setSavingLanguage(true);

    try {
      const corrected = correctedLanguageIdentity(language, {
        translationLanguage: item.translation_language,
        pairAtCreation: item.language_pair_at_creation ?? {
          primary: item.word_language,
          secondary: item.translation_language,
        },
      });

      const fields = {
        word_language: corrected.termLanguage,
        translation_language: corrected.translationLanguage,
        language_source: corrected.source,
        language_confidence: corrected.confidence,
        needs_language_review: corrected.needsReview,
        texts: relabelLanguage(
          item.texts,
          item.word_language,
          corrected.termLanguage,
        ),
        examples: relabelLanguage(
          item.examples,
          item.word_language,
          corrected.termLanguage,
        ),
      };

      await updateVocabularyLanguage(item.id, fields);

      const next: VocabularyItem = {
        ...item,
        ...fields,
        language: corrected.termLanguage,
      };

      updateItem(next);
      if (detailItem?.id === item.id) setDetailItem(next);
      setLanguageItem(null);
    } finally {
      setSavingLanguage(false);
    }
  }

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

  const searchHasNoResults =
    query.trim().length > 0 && !loading && visibleItems.length === 0;

  /* One destination, two doors: the search toolbar's folder button and the
     Command Halo's Collect node. Shared so they can never drift apart. */
  const openCollections = () => router.push("/vocabulary/collections");

  const yumiProps = {
    items: uniqueItems,
    dailyGoal,
    dailyProgress,
    searchHasNoResults,
    cardGlancePulse,
    onStartReview: () => router.push("/review?from=vocabulary"),
    onAddWord: openAiSearch,
    onOpenCamera: () => router.push("/capture?source=camera&from=vocabulary"),
    /*
     * The Pronunciation Lab's only other entry point is on the standard home
     * screen (see PronunciationHub), so before the Command Halo carried it,
     * switching to Cosmic Mode hid a whole room. Same destination, second
     * door — not a second lab.
     */
    onOpenPronunciation: () =>
      router.push("/pronunciation?from=vocabulary"),
    onOpenCollections: openCollections,
  };

  const searchProps = buildVocabularySearchProps({
    totalWords,
    learningWords,
    masteredWords,
    query,
    quickFilter,
    quickFilters,
    visibleCount: visibleItems.length,
    sortMode,
    viewMode,
    rankingLoading,
    rankingError,
    setQuery: (value: string) => {
      setExpandedItemId(null);
      setQuery(value);
    },
    resetLookup,
    setQuickFilter: (value) => {
      setExpandedItemId(null);
      setQuickFilter(value);
    },
    setSortOpen,
    openCollections,
    openLanguageFilter: () => setLanguageFilterOpen(true),
    toggleViewMode,
    languageFilter,
    languageCount: languageCounts.size,
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
    expandedItemId,
    viewMode,
    languageFilter,
    onLookupWord: lookupWord,
    onSaveLookupResult: saveLookupResult,
    /*
     * Sharing a looked-up word does not save it first. The send path only ever
     * needed the card, so a word can go to a friend without being added to
     * your own vocabulary — which is often the point of looking it up.
     */
    onShareLookupResult: () => {
      if (!lookupResult) return;

      shareCard({
        word: lookupResult.englishName,
        translation: lookupResult.chineseName,
        partOfSpeech: lookupResult.partOfSpeech,
        examples: {
          en: lookupResult.englishExample,
          "zh-TW": lookupResult.chineseExample,
        },
      });
    },
    onChangeStatus: changeStatus,
    onDeleteItem: deleteVocabularyItem,
    onOpenDetail: (item: VocabularyItem) => {
      setDetailItem(item);
      setCardGlancePulse((count) => count + 1);
    },
    onToggleExpanded: (item: VocabularyItem) => {
      setExpandedItemId((current) => (current === item.id ? null : item.id));
      setCardGlancePulse((count) => count + 1);
    },
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
      lookupDegraded,
      lookupPreview,
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
      onChangeLanguage: () => {
        if (detailItem) setLanguageItem(detailItem);
      },
    },

    collectionsItem,
    onCloseCollections: () => setCollectionsItem(null),

    languageFilterOpen,
    languageFilterProps: {
      open: languageFilterOpen,
      selected: languageFilter,
      counts: languageCounts,
      totalCount: totalWords,
      onClose: () => setLanguageFilterOpen(false),
      onChange: (languages) => {
        setExpandedItemId(null);
        setLanguageFilter(languages);
      },
    },

    languageItem,
    languageSheetProps: languageItem
      ? {
          open: true,
          word: languageItem.word,
          current: languageItem.word_language,
          saving: savingLanguage,
          onClose: () => setLanguageItem(null),
          onSelect: (language) => {
            void applyLanguageCorrection(languageItem, language);
          },
        }
      : null,

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

  /*
   * Whether anything in the overlay tree is open.
   *
   * Computed here, beside the props themselves, rather than in the page —
   * which used to re-derive it by listing the overlays it knew about. That
   * list had to be kept in step with this object by hand and nothing checked
   * it, so adding the language filter mounted no sheet at all: the state flipped,
   * the gate did not know to look at it, and the button appeared dead.
   *
   * Every open-ness signal in overlaysProps is read here. A new overlay added
   * above is a new line here, in the same file, a few lines away.
   *
   * It cannot live with VocabularyOverlays, which would couple it to the prop
   * type even more tightly: that module is loaded on demand precisely so its
   * sheets are not in the first bundle, and importing a predicate out of it
   * would pull the whole tree back in — defeating the gate it feeds.
   */
  const overlaysOpen =
    overlaysProps.lookupProps.open ||
    overlaysProps.sortOpen ||
    overlaysProps.filtersOpen ||
    overlaysProps.languageFilterOpen ||
    overlaysProps.friendPickerOpen ||
    Boolean(overlaysProps.detailItem) ||
    Boolean(overlaysProps.languageItem) ||
    Boolean(overlaysProps.collectionsItem) ||
    Boolean(overlaysProps.editItem);

  return {
    heroProps,
    yumiProps,
    mainContentProps,
    overlaysProps,
    overlaysOpen,
    learningLanguage,
  };
}
