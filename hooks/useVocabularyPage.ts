import { useCallback, useMemo, useState } from "react";

import type { SortMode } from "@/components/vocabulary/SortBottomSheet";
import { DEFAULT_SORT_MODE } from "@/components/vocabulary/SortBottomSheet";
import type { VocabularyStatus } from "@/lib/types/app";

type ResetLookup = () => void;

type UseVocabularyPageOptions = {
  initialAiSearchOpen?: boolean;
};

export function useVocabularyPage({
  initialAiSearchOpen = false,
}: UseVocabularyPageOptions = {}) {
  const [query, setQuery] = useState("");

  const [quickFilter, setQuickFilter] = useState<
    "all" | VocabularyStatus
  >("all");

  const [sortMode, setSortMode] = useState<SortMode>(DEFAULT_SORT_MODE);
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [aiSearchOpen, setAiSearchOpen] = useState(initialAiSearchOpen);

  const openAiSearch = useCallback((resetLookup: ResetLookup) => {
    setQuery("");
    resetLookup();
    setAiSearchOpen(true);
  }, []);

  const closeAiSearch = useCallback((resetLookup: ResetLookup) => {
    setAiSearchOpen(false);
    setQuery("");
    resetLookup();
  }, []);

  return useMemo(
    () => ({
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

      openAiSearch,
      closeAiSearch,
    }),
    [
      query,
      quickFilter,
      sortMode,
      sortOpen,
      filtersOpen,
      aiSearchOpen,
      openAiSearch,
      closeAiSearch,
    ],
  );
}
