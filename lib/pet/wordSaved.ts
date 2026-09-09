"use client";

/* =========================================================
   Telling Yumi a word arrived

   The alternative was threading a callback from every place a word can be
   saved — the search sheet, the deck console, the capture screen, the
   message drawer — down to whichever Yumi happens to be on screen, through
   layouts that have no other reason to know about either end. This is one
   module-scope set of listeners and a function that calls them.

   Deliberately carries the word itself and nothing else. Yumi reacts to
   *something being saved*; it does not need the row, and giving it one would
   invite a second copy of the library to grow here.
   ========================================================= */

export type WordSavedSignal = {
  term: string;
  /** True when the reader had to be shown the word already existed. */
  duplicate: boolean;
};

type Listener = (signal: WordSavedSignal) => void;

const listeners = new Set<Listener>();

export function subscribeToWordSaved(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * A word has landed in the library.
 *
 * Called after the write succeeds, never before: Yumi celebrating a save
 * that then failed is worse than Yumi celebrating a moment late.
 */
export function announceWordSaved(signal: WordSavedSignal): void {
  for (const listener of [...listeners]) {
    try {
      listener(signal);
    } catch {
      // One misbehaving listener must not stop the others, and none of them
      // is doing anything a save should be rolled back for.
    }
  }
}
