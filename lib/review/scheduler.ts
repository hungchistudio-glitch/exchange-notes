import type { VocabularyItem } from "@/lib/types/app";
import {
  formatInterval,
  scheduleSm2,
  type ReviewGrade,
  type ReviewUpdate,
} from "@/lib/review/sm2";

export type { ReviewGrade, ReviewUpdate };

export function isDue(item: VocabularyItem, now = new Date()) {
  if (!item.next_review_at) return true;
  return new Date(item.next_review_at).getTime() <= now.getTime();
}

export function scheduleReview(
  item: VocabularyItem,
  grade: ReviewGrade,
  now = new Date(),
) {
  return scheduleSm2(item, grade, now);
}

export function formatNextReview(grade: ReviewGrade, item: VocabularyItem) {
  return formatInterval(scheduleSm2(item, grade, new Date(0)).review_interval);
}
