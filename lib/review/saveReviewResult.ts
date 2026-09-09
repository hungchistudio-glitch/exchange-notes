import { createClient } from "@/lib/supabase/client";
import { scheduleSm2, type ReviewGrade } from "@/lib/review/sm2";
import type { VocabularyItem } from "@/lib/types/app";

export async function saveReviewResult(
  id: string,
  grade: ReviewGrade,
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Please log in to save this review.");
  }

  const { data: current, error: readError } = await supabase
    .from("vocabulary_items")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (readError) {
    throw readError;
  }

  if (!current) {
    throw new Error("Vocabulary item not found.");
  }

  const next = scheduleSm2(
    current as VocabularyItem,
    grade,
  );

  const { error: updateError } = await supabase
    .from("vocabulary_items")
    .update(next)
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    throw updateError;
  }

  const { error: eventError } = await supabase
    .from("review_events")
    .insert({
      user_id: user.id,
      vocabulary_item_id: id,
      grade,
      interval_days: next.review_interval ?? 0,
      ease_factor: next.review_ease ?? 2.5,
      response_time_ms: null,
    });

  /*
   * The review itself is saved by this point, so a failed event write is not
   * the reader's problem and must not become their error. It is still worth
   * one line in the console for whoever is looking.
   */
  if (eventError) {
    console.warn("A review event could not be recorded.", {
      code: eventError.code,
      message: eventError.message,
    });
  }

  return next;
}
