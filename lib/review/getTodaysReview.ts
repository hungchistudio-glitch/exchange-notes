import type { VocabularyStats } from "@/types/vocabulary";
import { scheduleNextReview } from "./scheduleReview";

export function shouldReviewToday(
  stats: VocabularyStats
) {
  const nextReview = scheduleNextReview(stats);

  return nextReview.getTime() <= Date.now();
}

export function getTodaysReviewQueue<
  T extends { stats: VocabularyStats }
>(words: T[]) {
  return words.filter((word) =>
    shouldReviewToday(word.stats)
  );
}
