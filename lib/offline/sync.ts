"use client";

import {
  forgetMutation,
  readOutbox,
  type PendingMutation,
} from "@/lib/offline/vocabulary";
import { reportNetworkFailure, reportNetworkSuccess } from "@/hooks/useOnline";
import { createClient } from "@/lib/supabase/client";

/* =========================================================
   Telling the server what happened while it was away

   The outbox is replayed in order, and each entry is dropped only once the
   server has taken it. Anything still there when the app closes is still
   there when it opens.

   Two kinds of failure, and they must not be treated the same. A request
   that never reached anyone — no signal, again — leaves the entry alone
   and stops the run; there is nothing wrong with it and it will go through
   later. A request the server actively rejected will be rejected the same
   way forever, and an outbox that retries it every thirty seconds for the
   rest of the reader's life is a queue that never drains and a battery
   that never rests. Those are dropped, loudly.
   ========================================================= */

/**
 * Errors that mean "the server heard you and said no".
 *
 * Postgres codes, not HTTP: PostgREST reports a duplicate key or a failed
 * check constraint through the body rather than the status. Replaying any
 * of these produces the same answer, so they are terminal.
 */
const TERMINAL_CODES = new Set([
  "23505", // unique violation — the row is already there, which is success
  "23514", // check violation
  "23503", // foreign key violation — the thing it referenced is gone
  "22P02", // invalid text representation
  "42501", // insufficient privilege
]);

type SupabaseError = { code?: string; message?: string } | null;

function isTerminal(error: SupabaseError): boolean {
  return Boolean(error?.code && TERMINAL_CODES.has(error.code));
}

async function send(
  supabase: ReturnType<typeof createClient>,
  mutation: PendingMutation,
): Promise<SupabaseError> {
  switch (mutation.kind) {
    case "insert": {
      const { item } = mutation;

      const { error } = await supabase.from("vocabulary_items").insert({
        // The id travels with it. Everything written while offline that
        // refers to this word refers to this id, so the server has to
        // accept the one the device already used rather than mint its own.
        id: item.id,
        user_id: item.user_id,
        word: item.word,
        translation: item.translation,
        texts: item.texts,
        examples: item.examples,
        word_language: item.word_language,
        translation_language: item.translation_language,
        language: item.word_language,
        part_of_speech: item.part_of_speech,
        example_sentence: item.example_sentence,
        translated_example: item.translated_example,
        category: item.category,
        confidence: item.confidence,
        status: item.status,
        created_at: item.created_at,
      });

      return error;
    }

    case "status": {
      const { error } = await supabase
        .from("vocabulary_items")
        .update({ status: mutation.status, updated_at: mutation.at })
        .eq("id", mutation.itemId);

      return error;
    }

    case "fields": {
      const { error } = await supabase
        .from("vocabulary_items")
        .update({ ...mutation.fields, updated_at: mutation.at })
        .eq("id", mutation.itemId);

      return error;
    }

    case "delete": {
      const { error } = await supabase
        .from("vocabulary_items")
        .delete()
        .eq("id", mutation.itemId);

      return error;
    }
  }
}

export type FlushResult = {
  sent: number;
  dropped: number;
  remaining: number;
};

/**
 * Sends everything the outbox is holding, oldest first.
 *
 * Stops at the first entry that could not be delivered rather than
 * skipping past it: the queue is ordered because the changes were, and
 * sending the fourth edit to a word before the second is how a reader ends
 * up with a value they never chose.
 */
export async function flushOutbox(): Promise<FlushResult> {
  const pending = await readOutbox();

  if (pending.length === 0) {
    return { sent: 0, dropped: 0, remaining: 0 };
  }

  const supabase = createClient();

  let sent = 0;
  let dropped = 0;

  for (const [index, mutation] of pending.entries()) {
    let error: SupabaseError;

    try {
      error = await send(supabase, mutation);
    } catch {
      // Never reached anyone. Leave it, and let the reader know why the
      // screen still says there is something waiting.
      reportNetworkFailure();
      return { sent, dropped, remaining: pending.length - index };
    }

    reportNetworkSuccess();

    if (error && !isTerminal(error)) {
      return { sent, dropped, remaining: pending.length - index };
    }

    if (error) {
      console.error(
        `Dropped an offline change the server refused (${error.code}):`,
        error.message,
      );
      dropped += 1;
    } else {
      sent += 1;
    }

    if (typeof mutation.id === "number") await forgetMutation(mutation.id);
  }

  return { sent, dropped, remaining: 0 };
}
