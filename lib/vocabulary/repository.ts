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
  language: "english" | "traditional_chinese";
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
