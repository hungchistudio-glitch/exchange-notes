"use client";

import { useSyncExternalStore } from "react";

import {
  DEFAULT_LAUNCH_SOUND_ENABLED,
  getLaunchSoundEnabled,
  subscribeToLaunchSound,
} from "@/lib/appPreferences";

/**
 * Whether the opening animation is allowed to make a sound.
 *
 * Not routed through DevicePreferencesContext like the font size and the goal
 * are, because it is not one of the preferences the server has to know: it
 * changes no HTML, only whether an audio element is asked to play. The third
 * argument is the server's answer and the hydrating render's answer, so the
 * two agree and a reader who turned the sound off gets one switch updating
 * after hydration rather than a document rebuilding.
 */
export default function useLaunchSoundEnabled(): boolean {
  return useSyncExternalStore(
    subscribeToLaunchSound,
    getLaunchSoundEnabled,
    () => DEFAULT_LAUNCH_SOUND_ENABLED,
  );
}
