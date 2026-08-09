"use client";

import { useMemo, useSyncExternalStore } from "react";

import { buildReviewAnalytics } from "@/lib/review/analytics";
import {
  getDailyGoalWords,
  subscribeToDailyGoalWords,
} from "@/lib/appPreferences";

import useTranslation from "@/hooks/i18n/useTranslation";

import type {
  VocabularyItem,
  VocabularyStatus,
} from "@/lib/types/app";

export type VocabularyQuickFilter = {
  value: "all" | VocabularyStatus;
  label: string;
  count: number;
};

export default function useVocabularyStats(items: VocabularyItem[]) {
  const { t } = useTranslation();
  const search = t.vocabulary.search;

  /*
   * Read here rather than threaded through both callers, and read as an
   * external store so changing it in Settings updates the hero without a
   * reload. Until now this was the literal 10 below, which is why the setting
   * appeared to do nothing.
   */
  const dailyGoal = useSyncExternalStore(
    subscribeToDailyGoalWords,
    getDailyGoalWords,
    getDailyGoalWords,
  );

  return useMemo(() => {
    const totalWords = items.length;
    const newWords = items.filter((item) => item.status === "new").length;
    const learningWords = items.filter(
      (item) => item.status === "learning",
    ).length;
    const masteredWords = items.filter(
      (item) => item.status === "mastered",
    ).length;

    const todayKey = new Date().toDateString();
    const todayAdded = items.filter((item) => {
      if (!item.created_at) return false;

      return new Date(item.created_at).toDateString() === todayKey;
    }).length;

    const dailyProgress = Math.min(todayAdded, dailyGoal);

    const reviewStats = buildReviewAnalytics(items);

    const quickFilters: VocabularyQuickFilter[] = [
      {
        value: "all",
        label: search.statuses.all,
        count: totalWords,
      },
      {
        value: "new",
        label: search.statuses.new,
        count: newWords,
      },
      {
        value: "learning",
        label: search.statuses.learning,
        count: learningWords,
      },
      {
        value: "mastered",
        label: search.statuses.mastered,
        count: masteredWords,
      },
    ];

    return {
      totalWords,
      newWords,
      learningWords,
      masteredWords,
      todayAdded,
      dailyGoal,
      dailyProgress,
      quickFilters,
      reviewStats,
    };
  }, [items, search, dailyGoal]);
}
