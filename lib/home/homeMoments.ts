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
  /** A lookup came back without a meaning — every model was busy and the
      offline dictionary does not speak this pair — or did not come back at
      all. Nothing can be kept from it, and a tour waiting for a save has to
      know that rather than wait forever. */
  | "word-unavailable"
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

/* ---------------------------------------------------------
   One request in the other direction

   The tour's feed step needs the cookies, and they are faded and out of
   reach while the search is showing an answer — which it always is right
   after the keep step, because keeping a word is done on that answer. The
   field owns its own state, so the tour asks rather than reaches in. Kept
   here rather than in a module of its own because the home screen's first
   render already loads this one (tests/routeImportWeight.test.ts).
   --------------------------------------------------------- */

const dismissListeners = new Set<() => void>();

export function onHomeSearchDismiss(listener: () => void): () => void {
  dismissListeners.add(listener);
  return () => {
    dismissListeners.delete(listener);
  };
}

export function dismissHomeSearch(): void {
  for (const listener of [...dismissListeners]) {
    try {
      listener();
    } catch {
      /* Nothing a dismissal does is worth stopping the others for. */
    }
  }
}

/* ---------------------------------------------------------
   Going home from a search

   Dismissing empties the field at once. Going home is the motion a tap on
   Yumi makes (YumiRingOverlay.tsx, returnHome): the card fades, she glides
   back, the cookies follow, and the field is emptied on the way. The tour's
   feed step asks for this one, so the screen goes home the same way however
   it is asked to. With nobody on screen to make the motion — the ring is
   out, or this is not the home screen — it falls back to the dismissal.
   --------------------------------------------------------- */

const returnListeners = new Set<() => boolean>();

/** `listener` returns whether it took the return on. */
export function onHomeReturnRequest(listener: () => boolean): () => void {
  returnListeners.add(listener);
  return () => {
    returnListeners.delete(listener);
  };
}

export function returnHomeFromSearch(): void {
  for (const listener of [...returnListeners]) {
    try {
      if (listener()) return;
    } catch {
      /* Fall through to the plain dismissal below. */
    }
  }
  dismissHomeSearch();
}
