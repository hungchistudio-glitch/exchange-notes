"use client";

/* =========================================================
   The things a reader actually does on the home screen

   The tour used to be a description. Someone read seven pages about a dock
   that has since been replaced by a ring, pressed Finish, and arrived on a
   screen they had still never touched. A tour that asks you to do the thing
   needs to know whether you did it, and the alternative to this module is
   threading a callback from the scene, the search field and the cookie tray
   up through three components whose only reason to carry it would be the
   tour.

   So: one module-scope set of listeners, the same shape `lib/pet/wordSaved`
   already established, carrying the moment and nothing else. Nothing here
   knows a tour exists — these are things that happened, and the coach is
   simply the only thing listening at the moment.

   Saving a word is deliberately NOT here. It already has a store, and a
   second announcement of the same event is how two counts of the same thing
   start to disagree.
   ========================================================= */

export type HomeMoment =
  /** Her eye was pulled, or she was tapped, and the ring came out. */
  | "ring-opened"
  /** A lookup came back with a word — typed, spoken, photographed or read
      off a document. Which one it was does not matter here. */
  | "word-answered"
  /** A cookie reached her. */
  | "word-fed";

type Listener = (moment: HomeMoment) => void;

const listeners = new Set<Listener>();

export function subscribeToHomeMoments(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function announceHomeMoment(moment: HomeMoment): void {
  for (const listener of [...listeners]) {
    try {
      listener(moment);
    } catch {
      /* One listener throwing must not stop the others, and none of them is
         doing anything the reader's action should be undone for. */
    }
  }
}
