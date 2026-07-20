"use client";

import { useMemo } from "react";

import type { SortMode } from "@/components/vocabulary/SortBottomSheet";
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
  sortMode: SortMode;
  rankedIds: string[];
};

export default function useVisibleVocabularyItems({
  items,
  query,
  quickFilter,
  sortMode,
  rankedIds,
}: UseVisibleVocabularyItemsOptions) {
  return useMemo(() => {
    const normalizedQuery = normalizeVocabularyText(query);

    const filtered = items.filter((item) => {
      if (quickFilter !== "all" && item.status !== quickFilter) {
        return false;
      }

      if (!normalizedQuery) return true;

      return (
        normalizeVocabularyText(item.word).includes(normalizedQuery) ||
        normalizeVocabularyText(item.translation).includes(normalizedQuery)
      );
    });

    if (sortMode === "new") {
      return [...filtered].sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime(),
      );
    }

    const rankIndex = new Map(
      rankedIds.map((id, index) => [id, index]),
    );

    return [...filtered].sort((a, b) => {
      const aRank = rankIndex.get(a.id);
      const bRank = rankIndex.get(b.id);

      if (aRank !== undefined && bRank !== undefined) {
        return aRank - bRank;
      }

      if (aRank !== undefined) return -1;
      if (bRank !== undefined) return 1;

      // Smart fallback while AI ranking is loading or unavailable.
      const statusScore: Record<VocabularyStatus, number> = {
        learning: 3,
        new: 2,
        mastered: 1,
      };

      const interactions = readInteractionMap();
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
  }, [items, query, quickFilter, rankedIds, sortMode]);
}
