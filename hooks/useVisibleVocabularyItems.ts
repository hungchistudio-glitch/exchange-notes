"use client";

import { useMemo } from "react";

import type { SortMode } from "@/components/vocabulary/SortBottomSheet";
import type { LanguageCode } from "@/lib/languages";
import type {
  VocabularyItem,
  VocabularyStatus,
} from "@/lib/types/app";
import { normalizeVocabularyText } from "@/lib/vocabulary/helpers";

type QuickFilter = "all" | VocabularyStatus;

type UseVisibleVocabularyItemsOptions = {
  items: VocabularyItem[];
  query: string;
  quickFilter: QuickFilter;
  /**
   * Which languages to show. Empty means all of them.
   *
   * A list rather than a single code even though the sheet only offers one
   * at a time: "French and Italian" is a question a Romance-language learner
   * will ask, and the shape that can answer it costs nothing now.
   */
  languages: readonly LanguageCode[];
  sortMode: SortMode;
};

export default function useVisibleVocabularyItems({
  items,
  query,
  quickFilter,
  languages,
  sortMode,
}: UseVisibleVocabularyItemsOptions) {
  return useMemo(() => {
    const normalizedQuery = normalizeVocabularyText(query);

    const filtered = items.filter((item) => {
      if (quickFilter !== "all" && item.status !== quickFilter) {
        return false;
      }

      /*
       * On the row's own language, never on the reader's.
       *
       * word_language is what the row was saved as and does not move, so a
       * word lands in the same bucket today as it will after three changes
       * of learning language. Filtering on whatever the card happens to be
       * rendering would move rows between buckets as the background fill
       * worked through the library.
       */
      if (languages.length > 0 && !languages.includes(item.word_language)) {
        return false;
      }

      if (!normalizedQuery) return true;

      /*
       * Every language the row is held in, not just the two it was saved as.
       *
       * The box searches the whole library — a Chinese word from an earlier
       * pairing is still findable while studying Italian — and a row that
       * knows the query in a third language should match on it.
       */
      const haystack = [
        item.word,
        item.translation,
        ...Object.values(item.texts ?? {}),
      ];

      return haystack.some((text) =>
        text
          ? normalizeVocabularyText(text).includes(normalizedQuery)
          : false,
      );
    });

    if (sortMode === "old") {
      return [...filtered].sort(
        (a, b) =>
          new Date(a.created_at ?? 0).getTime() -
          new Date(b.created_at ?? 0).getTime(),
      );
    }

    if (sortMode === "alphabetical") {
      return [...filtered].sort((a, b) =>
        a.word.localeCompare(b.word, undefined, { sensitivity: "base" }),
      );
    }

    if (sortMode === "reverse-alphabetical") {
      return [...filtered].sort((a, b) =>
        b.word.localeCompare(a.word, undefined, { sensitivity: "base" }),
      );
    }

    if (sortMode === "recently-reviewed") {
      return [...filtered].sort(
        (a, b) =>
          new Date(b.last_reviewed_at ?? 0).getTime() -
          new Date(a.last_reviewed_at ?? 0).getTime(),
      );
    }

    if (sortMode === "least-reviewed") {
      return [...filtered].sort((a, b) => {
        const reviewDifference =
          (a.review_count ?? 0) - (b.review_count ?? 0);

        if (reviewDifference !== 0) return reviewDifference;

        return (
          new Date(a.last_reviewed_at ?? 0).getTime() -
          new Date(b.last_reviewed_at ?? 0).getTime()
        );
      });
    }

    /*
     * Newest first, and the default the sheet opens on.
     *
     * This used to be one branch of eight and the function ended in a
     * ranking sort, ordered by ids from /api/vocabulary-rank with an
     * interaction-score fallback behind it. Those ids never arrived — the
     * route does not exist — so the fallback was the whole of it, reachable
     * only from two sort modes that always showed an error. Both are gone,
     * and with the last branch removed the default belongs at the end.
     */
    return [...filtered].sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime(),
    );
  }, [items, languages, query, quickFilter, sortMode]);
}
