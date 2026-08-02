import { buildReviewAnalytics } from "@/lib/review/analytics";
import { createClient } from "@/lib/supabase/client";
import type { VocabularyItem } from "@/lib/types/app";

export async function getReviewDashboardStats() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildReviewAnalytics([]);
  }

  const { data, error } = await supabase
    .from("vocabulary_items")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  return buildReviewAnalytics(
    (data ?? []) as VocabularyItem[],
  );
}
