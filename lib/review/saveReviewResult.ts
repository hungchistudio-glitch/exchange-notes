import { createClient } from "@/lib/supabase/client";
import type { ReviewGrade } from "@/types/vocabulary";

export async function saveReviewResult(
  id: string,
  grade: ReviewGrade,
) {
  const supabase = createClient();

  const now = new Date();
  const nextReviewAt = new Date(now);

  const intervalInDays =
    grade === "again"
      ? 0
      : grade === "hard"
        ? 1
        : grade === "good"
          ? 3
          : 7;

  nextReviewAt.setDate(
    nextReviewAt.getDate() + intervalInDays,
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Please log in to save this review.");
  }

  const { error } = await supabase
    .from("vocabulary_items")
    .update({
      last_reviewed_at: now.toISOString(),
      next_review_at: nextReviewAt.toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }
}
