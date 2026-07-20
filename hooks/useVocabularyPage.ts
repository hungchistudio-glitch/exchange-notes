import { useMemo, useState } from "react";

import type { SortMode } from "@/components/vocabulary/SortBottomSheet";

export function useVocabularyPage() {
  const [sortMode, setSortMode] = useState<SortMode>("new");
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [aiSearchOpen, setAiSearchOpen] = useState(false);

  return useMemo(
    () => ({
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
      sortMode,
      sortOpen,
      filtersOpen,
      aiSearchOpen,
    ],
  );
}
