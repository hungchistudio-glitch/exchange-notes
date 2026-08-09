"use client";

import { useSyncExternalStore } from "react";

import {
  getTutorialSeen,
  subscribeToTutorialSeen,
} from "@/lib/appPreferences";

/**
 * Whether this device has been shown the tour, read as an external store so
 * nothing has to copy it into state on mount.
 *
 * Both snapshots use the same getter, which returns true when there is no
 * window. That is what keeps the server and client renders identical for
 * someone who has already dismissed the tour — the alternative renders the
 * home screen, then throws the tour over it a frame later.
 */
export default function useTutorialSeen(): boolean {
  return useSyncExternalStore(
    subscribeToTutorialSeen,
    getTutorialSeen,
    getTutorialSeen,
  );
}
