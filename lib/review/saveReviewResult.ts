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

  return next;
}
