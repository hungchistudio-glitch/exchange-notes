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
        /*
         * The provenance travels with the row. A word saved on a train was
         * decided about on the train — replaying it a day later must not
         * re-derive its languages from whatever the reader is studying by
         * then, which is the whole failure this metadata exists to prevent.
         */
        language_source: item.language_source,
        language_confidence: item.language_confidence,
        language_pair_at_creation: item.language_pair_at_creation,
        needs_language_review: item.needs_language_review,
        image_url: item.image_url,
        /*
         * The picture travels with the row for the same reason the
         * provenance does. A word captured on a plane, queued, and replayed
         * on landing must arrive with the card image it was saved with —
         * the assets were already uploaded before the insert was queued, so
         * the paths are real by the time this runs.
         */
        media: item.media ?? null,
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

    case "language": {
      const { error } = await supabase
        .from("vocabulary_items")
        .update({
          ...mutation.fields,
          // Kept in step with word_language: the deprecated column is NOT
          // NULL and still means "the language of `word`".
          language: mutation.fields.word_language,
          updated_at: mutation.at,
        })
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
/*
 * The run in progress, if there is one.
 *
 * Two things start a flush — the app mounting, and the `online` event — and
 * the ordinary case is both at once: a reader opens the app as the signal
 * comes back. Nothing stopped them overlapping, so each held its own copy of
 * the outbox, read before the other had emptied it, and every queued change
 * was sent to the server twice. Duplicate inserts then came back as 23505,
 * which this module correctly treats as terminal — so a completely normal
 * reconnection logged "Dropped an offline change the server refused" and
 * counted work as discarded that had in fact been done. Both runs also
 * reported having sent everything, so the caller re-read the whole library
 * twice.
 *
 * Sharing the promise rather than dropping the second call: a caller that
 * asks for a flush is entitled to know when the outbox is empty, and the
 * answer to "is it flushed yet" is the same answer for both of them.
 */
let inFlight: Promise<FlushResult> | null = null;

export function flushOutbox(): Promise<FlushResult> {
  inFlight ??= drainOutbox().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

/*
 * Keeps going until there is nothing left, or nothing more will go.
 *
 * One pass reads the outbox once, so a word saved while that pass was in the
 * air is not in the copy it is working from — and with callers now sharing a
 * single run, that word would have waited for the next mount or the next
 * `online` event, which can be a long time on a device that is simply staying
 * online. The extra pass is free when there is nothing new: it is one indexed
 * read that comes back empty.
 *
 * Each pass either sends at least one entry or reports what it stopped on, so
 * this cannot spin.
 */
async function drainOutbox(): Promise<FlushResult> {
  let sent = 0;
  let dropped = 0;

  for (;;) {
    const pass = await runFlush();

    sent += pass.sent;
    dropped += pass.dropped;

    // Stopped on something undeliverable — no signal. Nothing behind it will
    // go through either, so report and leave the queue alone.
    if (pass.remaining > 0) return { sent, dropped, remaining: pass.remaining };

    const arrivedMeanwhile = await readOutbox();
    if (arrivedMeanwhile.length === 0) return { sent, dropped, remaining: 0 };
  }
}

async function runFlush(): Promise<FlushResult> {
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
