/**
 * Settings the reader chose by hand before signing in.
 *
 * ── Why this exists ────────────────────────────────────────────────────
 *
 * AccountPreferencesSync has one rule when the account already holds
 * settings: the account wins. That rule is right, and it is what makes a new
 * phone or a cleared browser come back looking like the reader left it —
 * because what it is overriding is ambient state nobody has said anything
 * about.
 *
 * It is wrong for a choice made seconds earlier on the page before. Picking
 * French on the landing page and watching the app come up in French and then
 * flip to English is not a sync, it is the app disagreeing with something the
 * reader just did. And it only happens to returning readers — a fresh account
 * stores nothing, so the device already wins there — which is exactly the
 * person least likely to read it as anything but a bug.
 *
 * So a choice made while signed out is recorded here as an intent, and the
 * sync treats those fields as the reader's answer rather than as the device's
 * leftovers: they override the account, and then they are written up so every
 * other device agrees.
 *
 * ── Why it is one-shot ─────────────────────────────────────────────────
 *
 * The marker is cleared by the first sync that reads it, and that matters on
 * a shared computer. A standing "this device prefers French" would be applied
 * to the next person who signs in here, which is the same failure this fixes,
 * pointed at someone else. An intent is spent when it has been acted on.
 */

import { type AccountPreferences } from "@/lib/preferences/accountPreferences";

/** The fields of AccountPreferences, as a value that can be recorded. */
export type PreferenceField = keyof AccountPreferences;

const STORAGE_KEY = "exchange-notes:preferences:chosen-before-sign-in";

const FIELDS: readonly PreferenceField[] = [
  "fontSize",
  "interfaceLanguage",
  "dailyGoalWords",
  "speech",
];

function isField(value: unknown): value is PreferenceField {
  return (
    typeof value === "string" &&
    (FIELDS as readonly string[]).includes(value)
  );
}

/**
 * Records that the reader set this preference by hand while signed out.
 *
 * Called from the signed-out surfaces themselves rather than decided inside
 * the setters: only the caller knows whether there is a session, and a setter
 * that guessed would mark every in-app change too — which on a shared
 * computer is how one person's settings reach the next person's account.
 */
export function markChosenBeforeSignIn(field: PreferenceField) {
  if (typeof window === "undefined") return;

  try {
    const next = new Set(readChosenBeforeSignIn());
    next.add(field);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    // Storage the reader has blocked costs them the override, not the choice:
    // the cookie is already written and this load is already in the language.
  }
}

/** Which preferences were chosen by hand while signed out. */
export function readChosenBeforeSignIn(): PreferenceField[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return [...new Set(parsed.filter(isField))];
  } catch {
    // Unreadable or written by an older build: no intent, account wins.
    return [];
  }
}

/** Spends the record. Called once the sync has acted on it. */
export function clearChosenBeforeSignIn() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear if nothing could be written.
  }
}

/**
 * The account's settings, with the reader's signed-out choices put back.
 *
 * Field by field rather than a spread of `local` over `stored`, because only
 * the recorded fields are intent — everything else on this device is the
 * leftovers the account is supposed to replace.
 */
export function applyChosenFields(
  stored: AccountPreferences,
  local: AccountPreferences,
  chosen: readonly PreferenceField[],
): AccountPreferences {
  const merged = { ...stored };

  for (const field of chosen) {
    // Each field is assigned to its own key, so the types stay exact.
    if (field === "fontSize") merged.fontSize = local.fontSize;
    if (field === "interfaceLanguage") merged.interfaceLanguage = local.interfaceLanguage;
    if (field === "dailyGoalWords") merged.dailyGoalWords = local.dailyGoalWords;
    if (field === "speech") merged.speech = local.speech;
  }

  return merged;
}
