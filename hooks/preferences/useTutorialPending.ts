"use client";

import { useSyncExternalStore } from "react";

import {
  getTutorialPending,
  subscribeToTutorialPending,
} from "@/lib/appPreferences";

/** Nobody is mid-tour as far as the server is concerned. */
const notPendingOnTheServer = () => false;

/**
 * Whether the tour is waiting to be shown, read as an external store so
 * nothing has to copy it into state on mount.
 *
 * The server snapshot is a flat `false` rather than the same getter the
 * browser uses. That getter reports "not pending" only because there is no
 * window to ask; handed to React as the *server* snapshot it is also used for
 * the hydrating render, where there is a window and the answer flips — so the
 * one person it matters to, someone who has just finished signing up, had
 * their very first load of the app rebuilt from scratch to add an overlay.
 *
 * Answering honestly instead means the tour arrives a beat after hydration,
 * which is what an overlay should do anyway: it has something to point at,
 * and the thing it points at has to be on screen first.
 */
export default function useTutorialPending(): boolean {
  return useSyncExternalStore(
    subscribeToTutorialPending,
    getTutorialPending,
    notPendingOnTheServer,
  );
}
