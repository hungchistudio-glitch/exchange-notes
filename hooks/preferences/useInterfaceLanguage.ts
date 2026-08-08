"use client";

import { useSyncExternalStore } from "react";

import {
  getInterfaceLanguage,
  subscribeToInterfaceLanguage,
} from "@/lib/appPreferences";

/**
 * The stored interface language is an external store, not component state, so
 * it is read through useSyncExternalStore rather than copied in on mount.
 *
 * Both snapshots use the same getter because it already returns the default
 * when there is no window, which keeps the server and client renders
 * identical — the reason the old copy-in effect could not simply move into a
 * useState initialiser.
 */
export default function useInterfaceLanguage() {
  return useSyncExternalStore(
    subscribeToInterfaceLanguage,
    getInterfaceLanguage,
    getInterfaceLanguage,
  );
}
