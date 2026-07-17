import { createClient } from "@/lib/supabase/client";
import type { ReviewGrade } from "@/types/vocabulary";

type ReviewState = {
  review_count: number | null;
  correct_count: number | null;
  review_interval: number | null;
  review_ease: number | null;
};

function getNextReviewState(
  current: ReviewState,
  grade: ReviewGrade,
) {
  const previousInterval = Number(
    current.review_interval ?? 0,
  );

  const previousEase = Number(
    current.review_ease ?? 2.5,
  );

  let interval: number;
  let ease: number;

  switch (grade) {
    case "again":
      interval = 0;
      ease = Math.max(1.3, previousEase - 0.2);
      break;

    case "hard":
      interval = Math.max(
        1,
        Math.round(previousInterval * 1.2),
      );
      ease = Math.max(1.3, previousEase - 0.15);
      break;

    case "good":
      interval =
        previousInterval <= 0
          ? 3
          : Math.max(
              3,
              Math.round(
                previousInterval * previousEase,
              ),
            );
      ease = previousEase;
      break;

    case "easy":
      interval =
        previousInterval <= 0
          ? 7
          : Math.max(
              7,
              Math.round(
                previousInterval *
                  previousEase *
                  1.3,
              ),
            );
      ease = previousEase + 0.15;
      break;
  }

  const now = new Date();
  const nextReviewAt = new Date(now);

  nextReviewAt.setDate(
    nextReviewAt.getDate() + interval,
  );

  return {
    reviewCount:
      Number(current.review_count ?? 0) + 1,
    correctCount:
      Number(current.correct_count ?? 0) +
      (grade === "again" ? 0 : 1),
    interval,
    ease,
    now,
    nextReviewAt,
  };
}

export async function saveReviewResult(
  id: string,
  grade: ReviewGrade,
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "Please log in to save this review.",
    );
  }

  const { data: current, error: readError } =
    await supabase
      .from("vocabulary_items")
      .select(`
        review_count,
        correct_count,
        review_interval,
        review_ease
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

  if (readError) {
    throw readError;
  }

  const next = getNextReviewState(
    current as ReviewState,
    grade,
  );

  const { error: updateError } = await supabase
    .from("vocabulary_items")
    .update({
      review_count: next.reviewCount,
      correct_count: next.correctCount,
      review_interval: next.interval,
      review_ease: next.ease,
      last_reviewed_at: next.now.toISOString(),
      next_review_at:
        next.nextReviewAt.toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    throw updateError;
  }
}
