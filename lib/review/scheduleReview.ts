import type { VocabularyStats } from "@/types/vocabulary";

const REVIEW_INTERVALS_IN_DAYS = [
  0,
  1,
  3,
  7,
  14,
  30,
  60,
  120,
];

export function scheduleNextReview(
  stats: VocabularyStats
): Date {
  const now = new Date();

  if (
    stats.reviewCount === 0 ||
    !stats.lastReviewedAt
  ) {
    return now;
  }

  const lastReviewedAt = new Date(
    stats.lastReviewedAt
  );

  if (Number.isNaN(lastReviewedAt.getTime())) {
    return now;
  }

  const intervalIndex = Math.min(
    stats.reviewCount,
    REVIEW_INTERVALS_IN_DAYS.length - 1
  );

  const nextReviewAt = new Date(
    lastReviewedAt
  );

  nextReviewAt.setDate(
    nextReviewAt.getDate() +
      REVIEW_INTERVALS_IN_DAYS[intervalIndex]
  );

  return nextReviewAt;
}
