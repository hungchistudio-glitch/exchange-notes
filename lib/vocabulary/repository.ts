import { reportNetworkFailure, reportNetworkSuccess } from "@/hooks/useOnline";
import type { LanguageCode } from "@/lib/languages";
import {
  draftVocabularyItem,
  queueMutation,
} from "@/lib/offline/vocabulary";
import { createClient } from "@/lib/supabase/client";
import { getVocabularyKey } from "@/lib/vocabulary/helpers";
import type {
  VocabularyCategory,
  VocabularyItem,
} from "@/lib/types/app";

/* =========================================================
   Writing with or without a connection

   Every mutation below takes the same shape: try the server, and where the
   request never reached anyone, write it to the outbox instead and carry
   on as though it had worked. From the reader's side it did — the word is
   saved, the card is marked known — and the outbox delivers it the next
   time there is signal.

   Only a *network* failure is queued. An error the server sent back is an
   answer, and answers are not retried: a duplicate word or a rejected
   value will be rejected the same way in an hour, and a queue that keeps
   trying is a queue that never drains.
   ========================================================= */

/**
 * Whether this failure means "nobody heard you" rather than "no".
 *
 * A Supabase error object carries a code and came from the server; a
 * thrown TypeError from fetch did not reach one. The second is the only
 * kind worth keeping for later.
 */
function isUnreachable(error: unknown): boolean {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    // PostgREST surfaces its own transport failures under this code.
    return code === undefined || code === null || code === "";
  }

  return true;
}

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

  /*
   * The id is minted here rather than by the database.
   *
   * Offline it has to be — everything saved afterwards that refers to this
   * word refers to this id — and using the same path online means the two
   * cases produce identical rows instead of nearly identical ones.
   */
  const draft = draftVocabularyItem({ ...payload } as never);

  try {
    const { data, error } = await supabase
      .from("vocabulary_items")
      .insert({
        ...payload,
        id: draft.id,
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

    reportNetworkSuccess();

    return data;
  } catch (error) {
    if (!isUnreachable(error)) throw error;

    reportNetworkFailure();

    await queueMutation({ kind: "insert", item: draft });

    // The row the caller would have got. It is not on the server yet, and
    // it does not need to be for the word to be the reader's.
    return draft;
  }
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

  try {
    const { error } = await supabase
      .from("vocabulary_items")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    reportNetworkSuccess();
  } catch (error) {
    if (!isUnreachable(error)) throw error;

    reportNetworkFailure();
    await queueMutation({ kind: "status", itemId: id, status });
  }
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

  try {
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

    reportNetworkSuccess();

    return data;
  } catch (error) {
    if (!isUnreachable(error)) throw error;

    reportNetworkFailure();
    await queueMutation({ kind: "fields", itemId: id, fields });

    // The caller reads this back into its own state; the edit is real on
    // the device whether or not the server has heard about it yet.
    return { id, ...fields } as never;
  }
}

export async function deleteVocabulary(
  id: string,
) {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from("vocabulary_items")
      .delete()
      .eq("id", id);

    if (error) throw error;

    reportNetworkSuccess();
  } catch (error) {
    if (!isUnreachable(error)) throw error;

    reportNetworkFailure();
    await queueMutation({ kind: "delete", itemId: id });
  }
}
