import type { VocabularyStats } from "@/types/vocabulary";

export function scheduleNextReview(
  stats: VocabularyStats
): Date {

  const now = new Date();

  if (stats.reviewCount === 0) {
    return now;
  }

  const intervals = [
    0,
    1,
    3,
    7,
    14,
    30,
    60,
    120,
  ];

  const index = Math.min(
    stats.reviewCount,
    intervals.length - 1
  );

  const next = new Date(now);

  next.setDate(
    next.getDate() + intervals[index]
  );

  return next;
}
