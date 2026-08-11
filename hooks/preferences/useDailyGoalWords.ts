"use client";

import { useSyncExternalStore } from "react";

import {
  getDailyGoalWords,
  subscribeToDailyGoalWords,
} from "@/lib/appPreferences";

/**
 * The stored daily goal, in new words, read as the external store it is rather than
 * copied into component state.
 *
 * Both snapshots use the same getter because it already returns the default
 * when there is no window, which keeps the server and client renders
 * identical. Same shape as useInterfaceLanguage — extracted here once the
 * Progress HUD needed the goal alongside the settings row that sets it.
 */
export default function useDailyGoalWords() {
  return useSyncExternalStore(
    subscribeToDailyGoalWords,
    getDailyGoalWords,
    getDailyGoalWords,
  );
}
