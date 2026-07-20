import { useMemo, useState } from "react";

import type { SortMode } from "@/components/vocabulary/SortBottomSheet";
import type { VocabularyStatus } from "@/lib/types/app";

export function useVocabularyPage() {
  const [quickFilter, setQuickFilter] = useState<
    "all" | VocabularyStatus
  >("all");

  const [sortMode, setSortMode] = useState<SortMode>("new");
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [aiSearchOpen, setAiSearchOpen] = useState(false);

  return useMemo(
    () => ({
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
    }),
    [
      quickFilter,
      sortMode,
      sortOpen,
      filtersOpen,
      aiSearchOpen,
    ],
  );
}
