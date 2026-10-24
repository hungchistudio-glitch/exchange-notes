import type { VocabularyItem } from "@/lib/types/app";

/** lib/review/sm2.ts: mastered at five repetitions in a row and a 21-day interval. */
export const MASTERY_REPETITIONS = 5;
export const MASTERY_INTERVAL_DAYS = 21;

/**
 * How far a word is towards mastered, 0 to 1, for its ring: the slower of
 * its two roads there, repetitions and interval, since it needs both. A
 * new word is empty and a mastered one full; a word that is learning never
 * shows either end, so the ring always says which of the three it is.
 */
export function masteryProgress(item: Pick<VocabularyItem, "status" | "review_repetitions" | "review_interval">) {
  if (item.status === "mastered") return 1;
  if (item.status === "new") return 0;
  const repetitions = Math.max(0, item.review_repetitions ?? 0) / MASTERY_REPETITIONS;
  const interval = Math.max(0, item.review_interval ?? 0) / MASTERY_INTERVAL_DAYS;
  return Math.min(0.92, Math.max(0.08, Math.min(repetitions, interval)));
}
