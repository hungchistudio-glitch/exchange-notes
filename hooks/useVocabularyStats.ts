"use client";

import { useMemo } from "react";

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

    const dailyGoal = 10;
    const dailyProgress = Math.min(todayAdded, dailyGoal);

    const quickFilters: VocabularyQuickFilter[] = [
      { value: "all", label: "All", count: totalWords },
      { value: "new", label: "New", count: newWords },
      { value: "learning", label: "Learning", count: learningWords },
      { value: "mastered", label: "Mastered", count: masteredWords },
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
    };
  }, [items]);
}
