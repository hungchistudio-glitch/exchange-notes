"use client";

import { useMemo } from "react";

import { buildReviewAnalytics } from "@/lib/review/analytics";

import useTranslation from "@/hooks/i18n/useTranslation";
import useDailyGoalWords from "@/hooks/preferences/useDailyGoalWords";

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
   * The goal the user actually chose, rather than a constant.
   *
   * This hook used to hardcode 10, Yumi's cookie tray hardcoded 3, and the
   * Settings row stored minutes that nothing read — three unrelated daily
   * goals in one app, none of them the one the user picked. Reading the
   * preference here makes this the single source, and every caller gets it
   * without threading a parameter through.
   */
  const dailyGoal = useDailyGoalWords();

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
  }, [dailyGoal, items, search]);
}
