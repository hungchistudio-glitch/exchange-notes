import type { ReviewGrade } from "@/types/vocabulary";

export type ReviewState = {
  reviewCount: number;
  correctCount: number;
  interval: number;
  ease: number;
};

export type ReviewResult = ReviewState & {
  nextReviewAt: string;
};

const MIN_EASE = 1.3;

export function calculateReview(
  state: ReviewState,
  grade: ReviewGrade,
): ReviewResult {

  let reviewCount = state.reviewCount + 1;
  let correctCount = state.correctCount;
  let interval = state.interval;
  let ease = state.ease || 2.5;

  if (grade !== "again") {
    correctCount++;
  }

  // ---------- First review ----------
  if (state.reviewCount === 0) {

    switch (grade) {
      case "again":
        interval = 0;
        break;

      case "hard":
        interval = 1;
        break;

      case "good":
        interval = 3;
        break;

      case "easy":
        interval = 5;
        ease += 0.05;
        break;
    }

  } else {

    switch (grade) {

      case "again":
        interval = 0;
        ease -= 0.20;
        break;

      case "hard":
        interval = Math.max(
          1,
          Math.round(interval * 1.2),
        );
        ease -= 0.05;
        break;

      case "good":
        interval = Math.max(
          1,
          Math.round(interval * ease),
        );
        break;

      case "easy":
        interval = Math.max(
          1,
          Math.round(interval * ease * 1.3),
        );
        ease += 0.05;
        break;

    }

  }

  ease = Math.max(MIN_EASE, ease);

  const nextReview = new Date();

  nextReview.setDate(
    nextReview.getDate() + interval,
  );

  return {
    reviewCount,
    correctCount,
    interval,
    ease,
    nextReviewAt: nextReview.toISOString(),
  };
}
