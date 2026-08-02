import type { VocabularyItem } from "@/lib/types/app";

export type DailyLessonReason =
  | "continue-learning"
  | "learn-new"
  | "refresh-memory";

export type DailyLesson = {
  item: VocabularyItem;
  reason: DailyLessonReason;
  reasonLabel: string;
};
