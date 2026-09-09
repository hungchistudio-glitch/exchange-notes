import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_INTERFACE_LANGUAGE,
  type InterfaceLanguage,
} from "@/lib/appPreferences";
import { parseAccountPreferences } from "@/lib/preferences/accountPreferences";
import { isLanguageCode, type LanguageCode } from "@/lib/languages";

/* =========================================================
   The two languages a notification should be written in

   One query for however many readers are being notified, because the
   reminder cron runs under a sixty-second ceiling and a query per user is
   how a job that works for ten people stops working for a thousand.
   ========================================================= */

export type ReaderLanguages = {
  userId: string;
  interfaceLanguage: InterfaceLanguage;
  learningLanguage: LanguageCode | null;
};

/*
 * app_preferences is asked for separately from learning_language in the
 * protected layout, because it arrived in a later migration and a database
 * without the column should not take the page down. Here both come off one
 * row: a cron that cannot read preferences should still send the reminder in
 * the reader's learning language rather than send nothing.
 */
type ProfileRow = {
  id: string;
  learning_language: string | null;
  app_preferences: unknown;
};

const FALLBACK: Omit<ReaderLanguages, "userId"> = {
  interfaceLanguage: DEFAULT_INTERFACE_LANGUAGE,
  learningLanguage: null,
};

/**
 * The interface and learning language for each of these readers.
 *
 * Every id asked for comes back, in the order asked. A profile that is
 * missing, unreadable, or has never stored a preference gets the default —
 * a reminder in one language is a reminder; no reminder is a bug.
 */
export async function readerLanguages(
  supabase: SupabaseClient,
  userIds: readonly string[],
): Promise<ReaderLanguages[]> {
  if (userIds.length === 0) return [];

  const found = new Map<string, Omit<ReaderLanguages, "userId">>();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, learning_language, app_preferences")
    .in("id", [...userIds]);

  if (error) {
    /*
     * Not thrown. The reminder is the point and the language is a detail of
     * it; losing the whole run because preferences could not be read would
     * trade something that matters for something that does not.
     */
    console.warn(
      `Reader languages could not be loaded (${error.code}); falling back to the default.`,
    );
  }

  for (const row of (data ?? []) as ProfileRow[]) {
    found.set(row.id, {
      interfaceLanguage: parseAccountPreferences(row.app_preferences)
        .interfaceLanguage,
      learningLanguage: isLanguageCode(row.learning_language)
        ? row.learning_language
        : null,
    });
  }

  return userIds.map((userId) => ({
    userId,
    ...(found.get(userId) ?? FALLBACK),
  }));
}
