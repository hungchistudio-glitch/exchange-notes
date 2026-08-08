import type { Dispatch, SetStateAction } from "react";
import { useCallback, useMemo, useState } from "react";

import type { SortMode } from "@/components/vocabulary/SortBottomSheet";
import { DEFAULT_SORT_MODE } from "@/components/vocabulary/SortBottomSheet";
import type { VocabularyStatus } from "@/lib/types/app";
import { toTraditional } from "@/lib/chinese/toTraditional";

type ResetLookup = () => void;

type UseVocabularyPageOptions = {
  initialAiSearchOpen?: boolean;
};

export function useVocabularyPage({
  initialAiSearchOpen = false,
}: UseVocabularyPageOptions = {}) {
  const [query, setRawQuery] = useState("");

  /**
   * Every route into the search box passes through here, so simplified
   * characters are rewritten once rather than at each entry point.
   *
   * Browser speech recognition is the reason this exists: it returns
   * simplified Chinese even when asked for zh-TW, which put simplified text
   * in the box and then failed to match the user's saved words — the list
   * would read "0 words" for a word they had definitely saved. Typed input
   * goes through the same conversion, since the app is Traditional-only.
   */
  const setQuery = useCallback<Dispatch<SetStateAction<string>>>((value) => {
    setRawQuery((current) =>
      toTraditional(typeof value === "function" ? value(current) : value),
    );
  }, []);

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
  }, [setQuery]);

  const closeAiSearch = useCallback((resetLookup: ResetLookup) => {
    setAiSearchOpen(false);
    setQuery("");
    resetLookup();
  }, [setQuery]);

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
      setQuery,
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
