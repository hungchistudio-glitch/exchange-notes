import type { VocabularyItem } from "@/lib/types/app";
import { calculateRetention } from "@/lib/review/sm2";

export type ReviewAnalytics = {
  due: number;
  reviewed: number;
  accuracy: number;
  retention: number;
  mastered: number;
  weak: number;
  /** Words answered today that are no longer due: today's queue, cleared. */
  clearedToday: number;
};

function isDue(item: VocabularyItem, now: number) {
  if (!item.next_review_at) return true;
  return new Date(item.next_review_at).getTime() <= now;
}

export function buildReviewAnalytics(items: VocabularyItem[]): ReviewAnalytics {
  const reviewedItems = items.filter((item) => (item.review_count ?? 0) > 0);
  const totalReviews = reviewedItems.reduce(
    (sum, item) => sum + (item.review_count ?? 0),
    0,
  );
  const correct = reviewedItems.reduce(
    (sum, item) => sum + (item.correct_count ?? 0),
    0,
  );
  const retention = reviewedItems.length
    ? Math.round(
        reviewedItems.reduce((sum, item) => sum + calculateRetention(item), 0) /
          reviewedItems.length,
      )
    : 100;

  const now = Date.now();
  const today = new Date(now).toDateString();

  return {
    due: items.filter((item) => isDue(item, now)).length,
    reviewed: totalReviews,
    accuracy: totalReviews ? Math.round((correct / totalReviews) * 100) : 0,
    retention,
    mastered: items.filter((item) => item.status === "mastered").length,
    weak: items.filter(
      (item) => (item.review_lapses ?? 0) >= 2 || calculateRetention(item) < 60,
    ).length,
    clearedToday: items.filter(
      (item) =>
        Boolean(item.last_reviewed_at) &&
        new Date(item.last_reviewed_at as string).toDateString() === today &&
        !isDue(item, now),
    ).length,
  };
}
