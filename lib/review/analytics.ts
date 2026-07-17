import type { VocabularyItem } from "@/lib/types/app";
import { calculateRetention } from "@/lib/review/sm2";

export type ReviewAnalytics = {
  due: number;
  reviewed: number;
  accuracy: number;
  retention: number;
  mastered: number;
  weak: number;
};

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

  return {
    due: items.filter((item) => {
      if (!item.next_review_at) return true;
      return new Date(item.next_review_at).getTime() <= Date.now();
    }).length,
    reviewed: totalReviews,
    accuracy: totalReviews ? Math.round((correct / totalReviews) * 100) : 0,
    retention,
    mastered: items.filter((item) => item.status === "mastered").length,
    weak: items.filter(
      (item) => (item.review_lapses ?? 0) >= 2 || calculateRetention(item) < 60,
    ).length,
  };
}
