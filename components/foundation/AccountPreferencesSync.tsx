"use client";

import { useEffect, useRef } from "react";

import {
  subscribeToAppFontSize,
  subscribeToDailyGoalWords,
  subscribeToInterfaceLanguage,
  subscribeToLaunchSound,
} from "@/lib/appPreferences";
import { loadTranslations } from "@/lib/i18n";
import {
  applyPreferencesLocally,
  isEmptyPreferences,
  parseAccountPreferences,
  preferencesEqual,
  readLocalPreferences,
  type AccountPreferences,
} from "@/lib/preferences/accountPreferences";
import { subscribeToSpeechSettings } from "@/lib/speech";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  /** `profiles.app_preferences` as loaded on the server, or null if unset. */
  stored: unknown;
};

/** Coalesces a burst of changes into one write. */
const WRITE_DEBOUNCE_MS = 700;

/**
 * Keeps this device's settings and the account's settings in step.
 *
 * Mounted once in the protected layout rather than wired into each settings
 * screen: every preference already publishes a change event, so one listener
 * per preference covers all of them and the screens stay unaware that
 * anything is being synced.
 */
export default function AccountPreferencesSync({ userId, stored }: Props) {
  /*
   * Suppresses the writer while the account's settings are being applied
   * locally. Applying them fires the same change events a user edit would,
   * which would otherwise echo straight back to the server.
   */
  const applyingRef = useRef(false);
  const lastWrittenRef = useRef<AccountPreferences | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let timer = 0;

    const write = () => {
      const preferences = readLocalPreferences();

      if (
        lastWrittenRef.current &&
        preferencesEqual(lastWrittenRef.current, preferences)
      ) {
        return;
      }

      lastWrittenRef.current = preferences;

      void supabase
        .from("profiles")
        .update({ app_preferences: preferences })
        .eq("id", userId)
        .then(({ error }) => {
          if (!error) return;
          /*
           * Deliberately soft. The setting is already applied and stored
           * locally, so a failed sync costs durability across devices, not
           * the user's choice. Retrying on the next change is enough.
           */
          console.error("Could not sync preferences to the account.", error);
          lastWrittenRef.current = null;
        });
    };

    const scheduleWrite = () => {
      if (applyingRef.current || cancelled) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(write, WRITE_DEBOUNCE_MS);
    };

    /*
     * First run decides which side is the source of truth.
     *
     * An account that has never stored preferences adopts whatever this
     * device already had, so the settings someone picked before this existed
     * are carried up rather than reset. Otherwise the account wins — that is
     * the whole point, and it is what makes a fresh device or a cleared
     * browser come back with the right settings.
     */
    if (isEmptyPreferences(stored)) {
      lastWrittenRef.current = null;
      write();
    } else {
      applyingRef.current = true;
      const storedPreferences = parseAccountPreferences(stored);

      void loadTranslations(storedPreferences.interfaceLanguage)
        .then(() => {
          if (cancelled) return;

          applyPreferencesLocally(storedPreferences);
          lastWrittenRef.current = readLocalPreferences();

          // Cleared after the events from applying have been delivered.
          window.setTimeout(() => {
            applyingRef.current = false;
          }, 0);
        })
        .catch((error) => {
          applyingRef.current = false;
          console.error("Could not load the account's interface language.", error);
        });
    }

    const unsubscribes = [
      subscribeToAppFontSize(scheduleWrite),
      subscribeToInterfaceLanguage(scheduleWrite),
      subscribeToDailyGoalWords(scheduleWrite),
      subscribeToLaunchSound(scheduleWrite),
      subscribeToSpeechSettings(scheduleWrite),
    ];

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      for (const unsubscribe of unsubscribes) unsubscribe();
    };
  }, [stored, userId]);

  return null;
}
