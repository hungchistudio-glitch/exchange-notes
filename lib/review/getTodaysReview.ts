import { createClient } from "@/lib/supabase/client";

export type ReviewWord = {
  id: string;
  english: string;
  chinese: string;
  example?: string | null;
};

export async function getTodaysReview(): Promise<ReviewWord[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("vocabulary_items")
    .select(`
      id,
      english:word,
      chinese:translation,
      example:example_sentence
    `)
    .eq("user_id", user.id)
    .lte("next_review_at", now)
    .order("next_review_at", {
      ascending: true,
    });

  if (error) {
    console.error(error);
    return [];
  }

  return (data ?? []) as ReviewWord[];
}
