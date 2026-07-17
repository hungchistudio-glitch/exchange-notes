import { createClient } from "@/lib/supabase/client";

export type VocabularyItem = {
  id: string;
  english: string;
  chinese: string;
  example: string | null;
};

export async function getVocabulary(): Promise<VocabularyItem[]> {
  const supabase = createClient();

  const {
    data: {
      user,
    },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("Could not load review user:", authError);
    return [];
  }

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("vocabulary_items")
    .select(`
      id,
      english:word,
      chinese:translation,
      example:example_sentence
    `)
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("Could not load review vocabulary:", error);
    return [];
  }

  return (data ?? []) as VocabularyItem[];
}
