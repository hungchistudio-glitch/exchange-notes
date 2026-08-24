"use client";

import { useCallback, useSyncExternalStore } from "react";

/* =========================================================
   Pointing at the search once, and then never again

   The tutorial is not the fix for a feature nobody can find — putting the
   search where it cannot be missed is. This is the small thing that goes on
   top: one sentence, the first time, saying what the field is for.

   It clears itself on first use rather than on a dismiss button alone,
   because a reader who has already searched does not need to be told where
   the search is, and a hint that outlives its usefulness is the exact
   clutter this app spends its restraint avoiding.
   ========================================================= */

const STORAGE_KEY = "exchange-notes-lexicon-onboarded-v1";

/**
 * Cached so the snapshot is a stable value rather than a localStorage read
 * on every render — useSyncExternalStore compares snapshots with Object.is,
 * and a getter that touches disk each time is a getter called far more often
 * than anyone intends.
 */
let seen: boolean | null = null;

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  if (seen === null) {
    try {
      seen = Boolean(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      // A blocked store means the hint never shows. Acceptable: it is a
      // nicety, and showing it on every load would be worse than never.
      seen = true;
    }
  }

  return !seen;
}

/**
 * Hidden during the server render and the hydrating one, so the two agree.
 * The hint appears a moment later, on this device's own answer.
 */
function getServerSnapshot(): boolean {
  return false;
}

export default function useLexiconOnboarding() {
  const visible = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const dismiss = useCallback(() => {
    if (seen) return;

    seen = true;

    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // See above — the in-memory flag still hides it for this session.
    }

    for (const listener of [...listeners]) listener();
  }, []);

  return { visible, dismiss };
}
