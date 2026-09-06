"use client";

import { useMemo } from "react";

import type { SortMode } from "@/components/vocabulary/SortBottomSheet";
import type { LanguageCode } from "@/lib/languages";
import type {
  VocabularyItem,
  VocabularyStatus,
} from "@/lib/types/app";
import {
  normalizeVocabularyText,
  readInteractionMap,
  type InteractionRecord,
} from "@/lib/vocabulary/helpers";

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
  rankedIds: string[];
};

export default function useVisibleVocabularyItems({
  items,
  query,
  quickFilter,
  languages,
  sortMode,
  rankedIds,
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

    if (sortMode === "new") {
      return [...filtered].sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime(),
      );
    }

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

    const rankIndex = new Map(
      rankedIds.map((id, index) => [id, index]),
    );

    /*
     * Read once, not once per comparison.
     *
     * This was inside the comparator, and a comparator runs O(n log n) times:
     * 400 words is 2,795 comparisons, and each one read the whole interaction
     * map out of localStorage and parsed it. Measured in a browser at 400
     * words, that is 687ms of blocked main thread for a single sort, against
     * 1.5ms for the same sort reading it once — 458 times the work, all of it
     * re-deriving the same object.
     *
     * It is the fallback branch, so it only bites when the AI ranking has not
     * arrived: while it loads, when it errors, and offline. That is exactly
     * arriving at the screen, which is when the reader is most likely to be
     * touching it — and a main thread blocked for most of a second on a
     * desktop, several on a phone, does not just stutter. It drops taps.
     *
     * The status weights moved out for the same reason: a fresh object was
     * being allocated on every comparison to hold three constants.
     */
    const interactions = readInteractionMap();

    const statusScore: Record<VocabularyStatus, number> = {
      learning: 3,
      new: 2,
      mastered: 1,
    };

    return [...filtered].sort((a, b) => {
      const aRank = rankIndex.get(a.id);
      const bRank = rankIndex.get(b.id);

      if (aRank !== undefined && bRank !== undefined) {
        return aRank - bRank;
      }

      if (aRank !== undefined) return -1;
      if (bRank !== undefined) return 1;

      const aInteraction = interactions[a.id];
      const bInteraction = interactions[b.id];

      const score = (record: InteractionRecord | undefined) =>
        record
          ? record.search * 5 +
            record.send * 5 +
            record.share * 4 +
            record.speak * 3 +
            record.view +
            record.status * 2
          : 0;

      const scoreDifference =
        score(bInteraction) +
        statusScore[b.status] * 10 -
        (score(aInteraction) + statusScore[a.status] * 10);

      if (scoreDifference !== 0) return scoreDifference;

      return (
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime()
      );
    });
  }, [items, languages, query, quickFilter, rankedIds, sortMode]);
}
