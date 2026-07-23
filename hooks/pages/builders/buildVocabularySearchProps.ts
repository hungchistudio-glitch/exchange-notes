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
> & {
  setQuery: (value: string) => void;
  resetLookup: () => void;
  openAiSearch: () => void;
  setQuickFilter: SearchProps["onQuickFilterChange"];
  setSortOpen: (open: boolean) => void;
  setFiltersOpen: (open: boolean) => void;
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
  rankingLoading,
  rankingError,
  setQuery,
  resetLookup,
  openAiSearch,
  setQuickFilter,
  setSortOpen,
  setFiltersOpen,
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

    onOpenAI: openAiSearch,
    onQuickFilterChange: setQuickFilter,
    onOpenSort: () => setSortOpen(true),
    onOpenLibrary: () => setFiltersOpen(true),
  };
}
