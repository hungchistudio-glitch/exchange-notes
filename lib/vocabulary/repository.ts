import { createClient } from "@/lib/supabase/client";
import { getVocabularyKey } from "@/lib/vocabulary/helpers";
import type {
  VocabularyCategory,
  VocabularyItem,
} from "@/lib/types/app";

export async function getCurrentUser() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function vocabularyExists(
  userId: string,
  word: string,
  translation: string,
) {
  const supabase = createClient();

  const key = getVocabularyKey(word, translation);

  const { data, error } = await supabase
    .from("vocabulary_items")
    .select("word, translation")
    .eq("user_id", userId);

  if (error) throw error;

  return (data ?? []).some(
    (item) =>
      getVocabularyKey(item.word, item.translation) === key,
  );
}

type InsertVocabulary = {
  user_id: string;
  word: string;
  translation: string;
  /*
   * Hyphen, matching the database.
   *
   * This said "traditional_chinese" with an underscore, which the column's
   * check constraint has never accepted — it allows 'english' and
   * 'traditional-chinese'. No caller had ever passed it, because every write
   * so far has been an English word, so the type was wrong in a branch nothing
   * took. Saving a phrase out of a Chinese message is the first call that
   * would have used it, and it would have been rejected.
   */
  language: "english" | "traditional-chinese";
  part_of_speech: string | null;
  example_sentence: string | null;
  translated_example: string | null;
  confidence: VocabularyItem["confidence"];
  category: VocabularyCategory;
  status: VocabularyItem["status"];
};

export async function insertVocabulary(
  payload: InsertVocabulary,
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("vocabulary_items")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  return data;
}


export async function fetchVocabulary(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("vocabulary_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    });

  if (error) throw error;

  return data;
}


export async function updateVocabularyStatus(
  id: string,
  status: VocabularyItem["status"],
) {
  const supabase = createClient();

  const { error } = await supabase
    .from("vocabulary_items")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function updateVocabularyFields(
  id: string,
  fields: {
    word: string;
    translation: string;
    example_sentence: string | null;
    translated_example: string | null;
  }
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("vocabulary_items")
    .update({
      ...fields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteVocabulary(
  id: string,
) {
  const supabase = createClient();

  const { error } = await supabase
    .from("vocabulary_items")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
