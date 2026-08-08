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
> & {
  setQuery: (value: string) => void;
  resetLookup: () => void;
  setQuickFilter: SearchProps["onQuickFilterChange"];
  setSortOpen: (open: boolean) => void;
  openCollections: () => void;
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
  rankingLoading,
  rankingError,
  setQuery,
  resetLookup,
  setQuickFilter,
  setSortOpen,
  openCollections,
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
    onToggleView: toggleViewMode,
  };
}
