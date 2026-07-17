import { createClient } from "@/lib/supabase/client";

export type VocabularyItem = {
  id: string;
  english: string;
  chinese: string;
  example?: string | null;
};

export async function getVocabulary(): Promise<VocabularyItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("vocabulary_items")
    .select("id, english, chinese, example")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(error);
    return [];
  }

  return (data ?? []) as VocabularyItem[];
}
