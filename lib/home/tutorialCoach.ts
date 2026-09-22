"use client";

/* =========================================================
   How far into the doing-tour this reader has got

   Per device rather than per account, for the same reason the ring's gesture
   hint is: the tour teaches a pair of hands where things are, and a phone
   that has never been shown the ring needs showing even if the account has
   seen it on a tablet.

   A store rather than an effect that reads localStorage on mount, because
   the coach sits on the home screen and an effect calling setState there is
   a second render of the whole screen to answer a question the browser could
   have answered during the first one. The server says "finished", so nobody
   who has done this watches step one flash past on a cold load.
   ========================================================= */

const KEY = "yumi-coach-step";

/** Set when the stepped overlay hands over, so the coach starts armed. */
const ARMED = "yumi-coach-armed";

/** Past the last step. Stored as the number so one key carries both. */
export const COACH_FINISHED = 99;

let cached: number | null = null;
const listeners = new Set<() => void>();

export function subscribeToCoach(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  for (const listener of listeners) listener();
}

export function getCoachStep(): number {
  if (cached === null) {
    try {
      const stored = window.localStorage.getItem(KEY);
      const armed = window.localStorage.getItem(ARMED) === "1";

      cached = stored === null ? (armed ? 0 : COACH_FINISHED) : Number(stored);

      if (!Number.isFinite(cached)) cached = COACH_FINISHED;
    } catch {
      /* A private window or blocked site data. Staying out of the way is the
         safe way to be wrong about this: a tour nobody asked for, on a
         screen they are already using, is worse than no tour. */
      cached = COACH_FINISHED;
    }
  }

  return cached;
}

/** The server has no localStorage and nobody is mid-tour on it. */
export const getServerCoachStep = () => COACH_FINISHED;

export function setCoachStep(step: number) {
  if (cached === step) return;
  cached = step;
  try {
    window.localStorage.setItem(KEY, String(step));
  } catch {
    /* It simply starts again next time, which is the recoverable half. */
  }
  notify();
}

/**
 * Hand over from the stepped overlay.
 *
 * Called when the welcome and the language setup are done, which is the
 * point the rest of the tour stops being something to read and becomes
 * something to do.
 */
export function armCoach() {
  try {
    window.localStorage.setItem(ARMED, "1");
  } catch {
    /* Then the coach does not start by itself; the tour row in Settings
       still opens it. */
  }
  setCoachStep(0);
}
