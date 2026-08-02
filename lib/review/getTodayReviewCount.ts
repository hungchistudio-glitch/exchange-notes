import { createClient } from "@/lib/supabase/client";

export async function getTodayReviewCount() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const now = new Date().toISOString();

  const { count, error } = await supabase
    .from("vocabulary_items")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("user_id", user.id)
    .lte("next_review_at", now);

  if (error) {
    console.error(error);
    return 0;
  }

  return count ?? 0;
}
