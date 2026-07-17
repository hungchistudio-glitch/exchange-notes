import type { VocabularyStats } from "@/types/vocabulary";

const INTERVALS = [
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
  if (
    stats.reviewCount === 0 ||
    !stats.lastReviewedAt
  ) {
    return new Date();
  }

  const last = new Date(stats.lastReviewedAt);

  if (Number.isNaN(last.getTime())) {
    return new Date();
  }

  const interval = INTERVALS[
    Math.min(
      stats.reviewCount,
      INTERVALS.length - 1
    )
  ];

  const next = new Date(last);

  next.setDate(
    next.getDate() + interval
  );

  return next;
}
