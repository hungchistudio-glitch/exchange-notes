import { createClient } from "@/lib/supabase/client";
import type { ReviewGrade, ReviewUpdate } from "@/lib/review/sm2";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isReviewUpdate(value: unknown): value is ReviewUpdate {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const update = value as Record<string, unknown>;
  const nextReviewAt = update.next_review_at;
  const lastReviewedAt = update.last_reviewed_at;

  return (
    (update.status === "learning" || update.status === "mastered")
    && typeof nextReviewAt === "string"
    && Number.isFinite(Date.parse(nextReviewAt))
    && typeof lastReviewedAt === "string"
    && Number.isFinite(Date.parse(lastReviewedAt))
    && isFiniteNumber(update.review_interval)
    && update.review_interval >= 0
    && isFiniteNumber(update.review_ease)
    && update.review_ease >= 1.3
    && update.review_ease <= 3.2
    && isNonNegativeInteger(update.review_count)
    && isNonNegativeInteger(update.correct_count)
    && update.correct_count <= update.review_count
    && isNonNegativeInteger(update.review_repetitions)
    && isNonNegativeInteger(update.review_lapses)
    && isNonNegativeInteger(update.retention_score)
    && update.retention_score <= 100
  );
}

export async function saveReviewResult(
  id: string,
  grade: ReviewGrade,
): Promise<ReviewUpdate> {
  const supabase = createClient();

  /*
   * Reading the row, calculating SM-2, updating it, and recording the event
   * happen behind this one call. The database locks the owned vocabulary row
   * first, so concurrent tabs calculate in sequence instead of overwriting
   * each other, and an event failure rolls the schedule update back too.
   */
  const { data, error } = await supabase.rpc("save_review_result_atomic", {
    p_vocabulary_item_id: id,
    p_grade: grade,
  });

  if (error) throw error;

  if (!isReviewUpdate(data)) {
    throw new Error("Review save returned an invalid result.");
  }

  return data;
}
