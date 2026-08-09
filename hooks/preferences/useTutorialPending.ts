"use client";

import { useSyncExternalStore } from "react";

import {
  getTutorialPending,
  subscribeToTutorialPending,
} from "@/lib/appPreferences";

/**
 * Whether the tour is waiting to be shown, read as an external store so
 * nothing has to copy it into state on mount.
 *
 * Both snapshots use the same getter, which reports "not pending" when there
 * is no window. Server and client therefore agree for everyone except the one
 * person who just finished signing up, and they are the only one who should
 * see anything appear.
 */
export default function useTutorialPending(): boolean {
  return useSyncExternalStore(
    subscribeToTutorialPending,
    getTutorialPending,
    getTutorialPending,
  );
}
