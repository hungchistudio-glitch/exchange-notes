"use client";

import { useSyncExternalStore } from "react";

/*
 * The reader's own minute.
 *
 * `new Date()` during the server render is the hour where the server is
 * standing — UTC in production — so for most of the day it disagrees with the
 * browser, and a disagreement in rendered text is a hydration mismatch. React
 * answers one of those by throwing away the server's tree and rebuilding the
 * page, which is a whole document repainting to correct a clock.
 *
 * So the server snapshot is null, both renders agree on "no time yet", and
 * the reader's own clock fills it in on mount. The opening film is still
 * covering this screen when that happens on a cold load.
 *
 * The snapshot is the minute index rather than the millisecond, for the
 * reason useSyncExternalStore requires: it has to be stable between renders
 * inside the same minute, or React re-renders forever. It changes exactly
 * when the displayed time would change, and not once more.
 */

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

/* Aligned to the wall clock, not to whenever the first subscriber arrived:
   the minute has to turn over when the reader's phone says it does. The 50ms
   is slack so a timer that fires a hair early does not read the old minute
   and then need a second tick to catch up. */
function schedule() {
  timer = setTimeout(() => {
    for (const listener of listeners) listener();
    schedule();
  }, 60_000 - (Date.now() % 60_000) + 50);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (timer === null) schedule();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => Math.floor(Date.now() / 60_000);
const getServerSnapshot = (): number | null => null;

/**
 * The current minute as a Date, or null until the browser has one.
 *
 * A new Date is built per minute rather than held, so nothing downstream can
 * mutate the store's own value.
 */
export default function useLocalClock(): Date | null {
  const minute = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return minute === null ? null : new Date(minute * 60_000);
}
