import type { Dispatch, SetStateAction } from "react";
import { useCallback, useMemo, useState } from "react";

import type { SortMode } from "@/components/vocabulary/SortBottomSheet";
import { DEFAULT_SORT_MODE } from "@/components/vocabulary/SortBottomSheet";
import type { LanguageCode } from "@/lib/languages";
import type { VocabularyStatus } from "@/lib/types/app";
import { toTraditional } from "@/lib/chinese/toTraditional";
import { anyLearningLanguageNeedsTraditional } from "@/lib/languages";

export function useVocabularyPage() {
  const [query, setRawQuery] = useState("");

  /**
   * Every route into the search box passes through here, so simplified
   * characters are rewritten once rather than at each entry point.
   *
   * Browser speech recognition is the reason this exists: it returns
   * simplified Chinese even when asked for zh-TW, which put simplified text
   * in the box and then failed to match the user's saved words — the list
   * would read "0 words" for a word they had definitely saved. Typed input
   * goes through the same conversion.
   *
   * Asked of every language the app teaches rather than of the one being
   * studied now: this box searches everything the user has ever saved, which
   * can be Chinese from an earlier pairing. The conversion is a no-op on text
   * with no Han characters, so a Spanish query passes through untouched.
   */
  const normalizesTraditional = anyLearningLanguageNeedsTraditional();

  const setQuery = useCallback<Dispatch<SetStateAction<string>>>(
    (value) => {
      setRawQuery((current) => {
        const next = typeof value === "function" ? value(current) : value;
        return normalizesTraditional ? toTraditional(next) : next;
      });
    },
    [normalizesTraditional],
  );

  const [quickFilter, setQuickFilter] = useState<
    "all" | VocabularyStatus
  >("all");

  /**
   * Which languages the list is limited to. Empty means all of them.
   *
   * A list from the start. The sheet offers one at a time today, and
   * "French and Italian" is a question this state can already answer when
   * it does not — see LanguageFilterSheet.
   *
   * Not persisted, and deliberately: a filter that survives a reload is a
   * filter a reader meets without having chosen it, and wonders where half
   * their library went.
   */
  const [languageFilter, setLanguageFilter] = useState<
    readonly LanguageCode[]
  >([]);
  const [languageFilterOpen, setLanguageFilterOpen] = useState(false);

  const [sortMode, setSortMode] = useState<SortMode>(DEFAULT_SORT_MODE);
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  return useMemo(
    () => ({
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
    }),
    [
      query,
      setQuery,
      quickFilter,
      languageFilter,
      languageFilterOpen,
      sortMode,
      sortOpen,
      filtersOpen,
    ],
  );
}
