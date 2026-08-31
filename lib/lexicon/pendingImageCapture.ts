"use client";

/* =========================================================
   The photograph, between reading it and saving the word

   The search sheet's image lookup and its save are two hooks that never
   meet. The lookup takes a photo, gets a word out of it and puts that word
   in the search box; the save happens later, from a result row, and has
   only ever seen text. So a word found by photographing something was saved
   with no picture at all — the one entry point where the image was thrown
   away outright.

   This is the smallest thing that joins them: one capture, held in memory,
   claimed by the save if the word matches.

   Held in memory and not written anywhere, which is the same rule the rest
   of the pipeline follows — nothing reaches storage until there is a row
   that will point at it. A reader who photographs a bottle, reads the
   answer and closes the sheet leaves nothing behind.

   Keyed on the term rather than simply being "the last capture" because the
   two can genuinely disagree: photograph a bottle, then type a different
   word and save that. The picture belongs to the word the model actually
   produced, and a mismatch means no picture rather than the wrong one.
   ========================================================= */

import type { PendingCapture } from "@/lib/media/assets";

type Held = {
  term: string;
  capture: PendingCapture;
};

let held: Held | null = null;

/** Compared case- and space-insensitively, the way a headword is. */
function sameTerm(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Hold the capture a lookup produced.
 *
 * Replaces whatever was there. A reader who photographs two things in a row
 * without saving the first meant the second.
 */
export function holdImageCapture(term: string, capture: PendingCapture) {
  held = { term, capture };
}

/**
 * Take the capture for this word, if it is the word that produced it.
 *
 * Consumes: a capture can be claimed once. Saving the same word twice
 * should not attach the same two files to both rows, because deleting
 * either would then take the other's picture with it.
 */
export function takeImageCapture(term: string): PendingCapture | null {
  if (!held || !sameTerm(held.term, term)) return null;

  const capture = held.capture;
  held = null;

  return capture;
}

/** Drop whatever is held. Called when the sheet closes. */
export function clearImageCapture() {
  held = null;
}
