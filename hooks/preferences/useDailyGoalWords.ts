"use client";

import { useDailyGoalWordsValue } from "@/contexts/DevicePreferencesContext";

/**
 * How many new words the reader is aiming for today.
 *
 * Read from the provider seeded with the request's cookie rather than from
 * localStorage during the render: the goal is rendered as a number, on the
 * settings row and behind Yumi's cookie tray, so a server that guessed the
 * default while the browser knew better disagreed in text — and React answers
 * a text mismatch by rebuilding the whole document.
 */
export default function useDailyGoalWords() {
  return useDailyGoalWordsValue();
}
