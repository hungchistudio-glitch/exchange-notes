import type { LanguageCode } from "@/lib/languages";
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
  /**
   * Which language each side is in. Required, and not defaulted.
   *
   * The columns carry defaults so that inserts written before they existed
   * kept working, and those defaults say English and Traditional Chinese —
   * which quietly files a Spanish word as an English one. Making the caller
   * say it is what lets those defaults come out.
   */
  word_language: LanguageCode;
  translation_language: LanguageCode;
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
    .insert({
      ...payload,
      /*
       * The deprecated column, filled here so no caller has to think about
       * it. It means "the language of `word`", which word_language now says
       * properly; nothing reads it any more, and it is NOT NULL, so it gets
       * the same answer in the same encoding until it can be dropped.
       */
      language: payload.word_language,
    })
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
