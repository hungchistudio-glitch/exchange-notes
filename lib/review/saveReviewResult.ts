import { calculateReview } from "@/lib/review/algorithm";
import { createClient } from "@/lib/supabase/client";
import type { ReviewGrade } from "@/types/vocabulary";

type DatabaseReviewState = {
  review_count: number | null;
  correct_count: number | null;
  review_interval: number | null;
  review_ease: number | null;
};

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

  if (!current) {
    throw new Error("Vocabulary item not found.");
  }

  const reviewState =
    current as DatabaseReviewState;

  const next = calculateReview(
    {
      reviewCount: Number(
        reviewState.review_count ?? 0,
      ),
      correctCount: Number(
        reviewState.correct_count ?? 0,
      ),
      interval: Number(
        reviewState.review_interval ?? 0,
      ),
      ease: Number(
        reviewState.review_ease ?? 2.5,
      ),
    },
    grade,
  );

  const { error: updateError } = await supabase
    .from("vocabulary_items")
    .update({
      review_count: next.reviewCount,
      correct_count: next.correctCount,
      review_interval: next.interval,
      review_ease: next.ease,
      last_reviewed_at: new Date().toISOString(),
      next_review_at: next.nextReviewAt,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    throw updateError;
  }

  return next;
}
