import type { ComponentProps } from "react";

import VocabularyHero from "@/components/vocabulary/VocabularyHero";

type ReviewStats = {
  due: number;
  accuracy: number;
  retention: number;
  weak: number;
};

type BuildVocabularyHeroPropsParams = {
  totalWords: number;
  learningWords: number;
  masteredWords: number;
  dailyGoal: number;
  dailyProgress: number;
  reviewStats: ReviewStats;
};

export default function buildVocabularyHeroProps({
  totalWords,
  learningWords,
  masteredWords,
  dailyGoal,
  dailyProgress,
  reviewStats,
}: BuildVocabularyHeroPropsParams): ComponentProps<typeof VocabularyHero> {
  return {
    todayProgress: dailyProgress,
    todayGoal: dailyGoal,
    totalWords,
    learningWords,
    masteredWords,
    dueToday: reviewStats.due,
    accuracy: reviewStats.accuracy,
    retention: reviewStats.retention,
    weakWords: reviewStats.weak,
  };
}
