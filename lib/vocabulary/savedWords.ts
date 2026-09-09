import type { VocabularyItem } from "@/lib/types/app";

/* =========================================================
   Telling the library a word was saved

   createVocabularyEntry is the one door into the vocabulary table, and its
   own comment says why: nine screens could save a word, each assembled its
   own row, and a tenth entry point gets the language handling for free
   because it cannot express a row without it.

   The list on screen was not part of that bargain. Five surfaces save a
   word — the camera, the news drawer, a message, the menu scanner and the
   lookup sheet — and only the lookup sheet ever told the app-wide library
   about it, by way of an `onSaved` callback its callers happened to wire to
   addItem. The other four saved the row and said nothing.

   Which is what the reader saw. The provider lives in the protected layout,
   so it stays mounted while they walk from the camera back to their words;
   `items` is the array it loaded when the app started, and nothing on that
   journey replaces it. The word was in the database and would not appear
   until the app was opened again.

   Why it looked like a problem that only large libraries had: on a small or
   new library the background language fill still has work to do, and it
   re-read the whole list when a batch landed — which made the missing word
   appear as a side effect. Once a library is settled the fill finds nothing
   missing and returns before it starts, that incidental refresh stops
   happening, and the bug is visible. It was always there.

   (That re-read is gone now: a batch reports the rows it changed and only
   those are merged. The incidental fix it used to provide was never the
   mechanism this file describes, which is why removing it changed nothing
   here.)

   So the announcement belongs at the door rather than at each of the five
   screens. A sixth save surface gets the list update the same way it gets
   the language handling: by using the door.
   ========================================================= */

type Listener = (item: VocabularyItem) => void;

const listeners = new Set<Listener>();

/**
 * Called with every word saved through createVocabularyEntry.
 *
 * Returns its own unsubscribe. In-process only and deliberately: this is one
 * tab telling itself something it already knows, not a sync channel. A word
 * saved on another device arrives the way it always did, when the list is
 * next read from the server.
 */
export function subscribeToSavedWords(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Announces a saved word to whoever is listening.
 *
 * A throwing listener must not fail the save. The row is already in the
 * database by the time this runs, and turning a screen's render bug into a
 * "could not save that word" — for a word that was saved — is strictly worse
 * than the stale list this exists to fix.
 */
export function announceWordSaved(item: VocabularyItem): void {
  for (const listener of [...listeners]) {
    try {
      listener(item);
    } catch (error) {
      console.error("A saved-word listener threw.", error);
    }
  }
}
