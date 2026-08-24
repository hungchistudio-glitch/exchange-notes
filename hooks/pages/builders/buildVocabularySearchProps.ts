import type { ComponentProps } from "react";

import VocabularySearchSection from "@/components/vocabulary/sections/VocabularySearchSection";

type SearchProps = ComponentProps<typeof VocabularySearchSection>;

type BuildVocabularySearchPropsParams = Pick<
  SearchProps,
  | "totalWords"
  | "learningWords"
  | "masteredWords"
  | "query"
  | "quickFilter"
  | "quickFilters"
  | "visibleCount"
  | "sortMode"
  | "rankingLoading"
  | "rankingError"
  | "viewMode"
  | "languageFilter"
  | "languageCount"
> & {
  setQuery: (value: string) => void;
  resetLookup: () => void;
  setQuickFilter: SearchProps["onQuickFilterChange"];
  setSortOpen: (open: boolean) => void;
  openCollections: () => void;
  openLanguageFilter: () => void;
  toggleViewMode: () => void;
};

export default function buildVocabularySearchProps({
  totalWords,
  learningWords,
  masteredWords,
  query,
  quickFilter,
  quickFilters,
  visibleCount,
  sortMode,
  viewMode,
  languageFilter,
  languageCount,
  rankingLoading,
  rankingError,
  setQuery,
  resetLookup,
  setQuickFilter,
  setSortOpen,
  openCollections,
  openLanguageFilter,
  toggleViewMode,
}: BuildVocabularySearchPropsParams): SearchProps {
  return {
    totalWords,
    learningWords,
    masteredWords,
    query,
    quickFilter,
    quickFilters,
    visibleCount,
    sortMode,
    viewMode,
    languageFilter,
    languageCount,
    rankingLoading,
    rankingError,

    onQueryChange: (value) => {
      setQuery(value);
      resetLookup();
    },

    onClear: () => {
      setQuery("");
      resetLookup();
    },

    onQuickFilterChange: setQuickFilter,
    onOpenSort: () => setSortOpen(true),
    onOpenCollections: openCollections,
    onOpenLanguageFilter: openLanguageFilter,
    onToggleView: toggleViewMode,
  };
}
