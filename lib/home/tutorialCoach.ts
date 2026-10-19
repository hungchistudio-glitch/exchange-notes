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

   ── Two tracks ─────────────────────────────────────────────────────────

   "full" is the whole tour, for a reader who has just arrived. "refresh" is
   only the steps a new edition of the tour added, for a reader who had
   already finished an earlier one (Chi, 2026-10-18: "只看新增部分"). Which
   steps those are is the coach's business (`refresh` on a step); this file
   only remembers which track is running and how far along it is.

   A reader is moved onto the refresh track once, the first time this device
   reads the store after the edition changes, and only if it had finished the
   tour before — not merely never started one. Finishing either track, or
   skipping it, records the current edition, so it does not come back.
   ========================================================= */

const KEY = "yumi-coach-step";

/** Set when the stepped overlay hands over, so the coach starts armed. */
const ARMED = "yumi-coach-armed";

/** Which list the stored step counts through. */
const TRACK = "yumi-coach-track";

/** The edition of the tour this device has finished. */
const EDITION = "yumi-coach-edition";

/**
 * The tour's current edition.
 *
 * 2 (2026-10-18): the dial, the two things a saved word earns, the
 * pronunciation lab and the shop's energy supply. Bump it when a new set of
 * steps is marked `refresh`, and readers who finished the last edition are
 * shown those steps, and only those.
 */
export const COACH_EDITION = 2;

/** Past the last step. Stored as the number so one key carries both. */
export const COACH_FINISHED = 99;

export type CoachTrack = "full" | "refresh";

let cached: number | null = null;
let cachedTrack: CoachTrack = "full";
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

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* It simply starts again next time, which is the recoverable half. */
  }
}

function read() {
  try {
    const stored = window.localStorage.getItem(KEY);
    const armed = window.localStorage.getItem(ARMED) === "1";
    const edition = Number(window.localStorage.getItem(EDITION) ?? 0);

    let step = stored === null ? (armed ? 0 : COACH_FINISHED) : Number(stored);
    if (!Number.isFinite(step)) step = COACH_FINISHED;

    cachedTrack = window.localStorage.getItem(TRACK) === "refresh" ? "refresh" : "full";

    /*
     * Finished an earlier edition: show what is new. `stored` being present
     * is what tells a reader who finished apart from one who never began —
     * both read as finished, but only one of them has seen the old tour.
     */
    if (stored !== null && step === COACH_FINISHED && edition < COACH_EDITION) {
      step = 0;
      cachedTrack = "refresh";
      write(KEY, "0");
      write(TRACK, "refresh");
      write(EDITION, String(COACH_EDITION));
    }

    cached = step;
  } catch {
    /* A private window or blocked site data. Staying out of the way is the
       safe way to be wrong about this: a tour nobody asked for, on a
       screen they are already using, is worse than no tour. */
    cached = COACH_FINISHED;
    cachedTrack = "full";
  }
}

export function getCoachStep(): number {
  if (cached === null) read();
  return cached ?? COACH_FINISHED;
}

export function getCoachTrack(): CoachTrack {
  if (cached === null) read();
  return cachedTrack;
}

/** The server has no localStorage and nobody is mid-tour on it. */
export const getServerCoachStep = () => COACH_FINISHED;
export const getServerCoachTrack = (): CoachTrack => "full";

export function setCoachStep(step: number) {
  if (cached === step) return;
  cached = step;
  write(KEY, String(step));

  /* Done with whichever track it was: this edition has now been seen. */
  if (step === COACH_FINISHED) {
    write(EDITION, String(COACH_EDITION));
    if (cachedTrack !== "full") {
      cachedTrack = "full";
      write(TRACK, "full");
    }
  }

  notify();
}

/**
 * Hand over from the stepped overlay.
 *
 * Called when the welcome and the language setup are done, which is the
 * point the rest of the tour stops being something to read and becomes
 * something to do. Always the full tour, in the current edition — including
 * for a reader replaying it from Settings.
 */
export function armCoach() {
  write(ARMED, "1");
  write(EDITION, String(COACH_EDITION));
  write(TRACK, "full");
  cachedTrack = "full";

  /* Already at step 0 (a replay from Settings mid-refresh, say): the track
     still changed, so the coach has to hear about it. */
  if (cached === 0) notify();
  else setCoachStep(0);
}

/** Tests only: forget what was read, so the next read sees localStorage. */
export function resetCoachCacheForTests() {
  cached = null;
  cachedTrack = "full";
}
