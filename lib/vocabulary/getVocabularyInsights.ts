import type { VocabularyItem } from "@/lib/types/app";

export type LearningStage =
  | "new"
  | "learning"
  | "reviewing"
  | "difficult"
  | "mastered";

export type VocabularyInsights = {
  stage: LearningStage;
  accuracy: number;
  reviewCount: number;
  correctCount: number;
  retention: number;
  nextReview: Date | null;
  nextReviewLabel: string;
};

function getStage(item: VocabularyItem): LearningStage {
  if (item.status === "mastered") return "mastered";

  const reviewCount = item.review_count ?? 0;
  const lapses = item.review_lapses ?? 0;

  if (lapses >= 3) return "difficult";

  if (reviewCount >= 5) return "reviewing";

  if (item.status === "learning") return "learning";

  return "new";
}

function getNextReviewLabel(date: Date | null): string {
  if (!date) return "Not scheduled";

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const target = new Date(date);

  target.setHours(0, 0, 0, 0);

  const diff =
    Math.round(
      (target.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24),
    );

  if (diff <= 0) return "Today";

  if (diff === 1) return "Tomorrow";

  return `In ${diff} days`;
}

export function getVocabularyInsights(
  item: VocabularyItem,
): VocabularyInsights {
  const reviewCount = item.review_count ?? 0;

  const correctCount = item.correct_count ?? 0;

  const accuracy =
    reviewCount === 0
      ? 0
      : Math.round((correctCount / reviewCount) * 100);

  const retention = Math.round(
    item.retention_score ?? accuracy,
  );

  const nextReview = item.next_review_at
    ? new Date(item.next_review_at)
    : null;

  return {
    stage: getStage(item),
    accuracy,
    reviewCount,
    correctCount,
    retention,
    nextReview,
    nextReviewLabel: getNextReviewLabel(nextReview),
  };
}
