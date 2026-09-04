/**
 * The settings that follow the account, marshalled between the local
 * preference modules and `profiles.app_preferences`.
 *
 * localStorage stays the working copy — it is synchronous, it is what the
 * settings screens already read, and it is what makes the choice apply before
 * the first paint. The account row is the durable one: it is what restores a
 * person's settings on a new device, after storage eviction, or the next time
 * they sign in.
 *
 * interface_mode and learning_language are deliberately not here. They have
 * their own columns and their own load paths (the root layout reads the mode
 * before rendering so Cosmic Mode paints correctly on the first frame), and
 * folding them into this document would mean reading them later than that.
 */

import {
  DEFAULT_APP_FONT_SIZE,
  DEFAULT_DAILY_GOAL_WORDS,
  DEFAULT_INTERFACE_LANGUAGE,
  getAppFontSize,
  getDailyGoalWords,
  getInterfaceLanguage,
  isAppFontSize,
  DEFAULT_LAUNCH_SOUND_ENABLED,
  getLaunchSoundEnabled,
  isDailyGoalWords,
  isInterfaceLanguage,
  setLaunchSoundEnabled,
  setAppFontSize,
  setDailyGoalWords,
  setInterfaceLanguage,
  type AppFontSize,
  type DailyGoalWords,
  type InterfaceLanguage,
} from "@/lib/appPreferences";
import {
  getDefaultSpeechSettings,
  getSpeechSettings,
  setSpeechSettings,
  type SpeechSettings,
} from "@/lib/speech";

export type AccountPreferences = {
  fontSize: AppFontSize;
  interfaceLanguage: InterfaceLanguage;
  dailyGoalWords: DailyGoalWords;
  launchSound: boolean;
  speech: SpeechSettings;
};

/** True when the account has never stored preferences (a fresh column). */
export function isEmptyPreferences(value: unknown): boolean {
  return (
    !value ||
    typeof value !== "object" ||
    Object.keys(value as Record<string, unknown>).length === 0
  );
}

/*
 * Parsed field by field rather than cast.
 *
 * This value is JSON from the database, so it can be stale, partial, or
 * written by an older build of the app. Anything unrecognised falls back to
 * the default for that one setting instead of discarding the whole document.
 */
export function parseAccountPreferences(value: unknown): AccountPreferences {
  const raw = (value ?? {}) as Record<string, unknown>;

  const dailyGoal = Number(raw.dailyGoalWords);

  return {
    fontSize: isAppFontSize(raw.fontSize) ? raw.fontSize : DEFAULT_APP_FONT_SIZE,

    interfaceLanguage: isInterfaceLanguage(raw.interfaceLanguage)
      ? raw.interfaceLanguage
      : DEFAULT_INTERFACE_LANGUAGE,

    dailyGoalWords: isDailyGoalWords(dailyGoal)
      ? dailyGoal
      : DEFAULT_DAILY_GOAL_WORDS,

    /*
     * Absent means "never chosen", which is the default rather than off — a
     * reader signing in on a new device before this setting existed should
     * get the app as it ships, not silently muted.
     */
    launchSound:
      typeof raw.launchSound === "boolean"
        ? raw.launchSound
        : DEFAULT_LAUNCH_SOUND_ENABLED,

    speech: parseSpeech(raw.speech),
  };
}

function parseSpeech(value: unknown): SpeechSettings {
  const defaults = getDefaultSpeechSettings();

  if (!value || typeof value !== "object") return defaults;

  const raw = value as Record<string, unknown>;

  const voiceURIs: SpeechSettings["voiceURIs"] = {};

  if (raw.voiceURIs && typeof raw.voiceURIs === "object") {
    for (const language of ["zh-TW", "en-US"] as const) {
      const uri = (raw.voiceURIs as Record<string, unknown>)[language];
      if (typeof uri === "string" && uri) voiceURIs[language] = uri;
    }
  }

  return {
    rate: typeof raw.rate === "number" ? raw.rate : defaults.rate,
    voiceGender:
      raw.voiceGender === "male" || raw.voiceGender === "female"
        ? raw.voiceGender
        : defaults.voiceGender,
    voiceURIs,
  };
}

/** What this device currently has, for writing up to the account. */
export function readLocalPreferences(): AccountPreferences {
  return {
    fontSize: getAppFontSize(),
    interfaceLanguage: getInterfaceLanguage(),
    dailyGoalWords: getDailyGoalWords(),
    launchSound: getLaunchSoundEnabled(),
    speech: getSpeechSettings(),
  };
}

/** Applies the account's settings to this device. */
export function applyPreferencesLocally(preferences: AccountPreferences) {
  setAppFontSize(preferences.fontSize);
  setInterfaceLanguage(preferences.interfaceLanguage);
  setDailyGoalWords(preferences.dailyGoalWords);
  setLaunchSoundEnabled(preferences.launchSound);
  setSpeechSettings(preferences.speech);
}

export function preferencesEqual(
  a: AccountPreferences,
  b: AccountPreferences,
): boolean {
  return (
    a.fontSize === b.fontSize &&
    a.interfaceLanguage === b.interfaceLanguage &&
    a.dailyGoalWords === b.dailyGoalWords &&
    a.launchSound === b.launchSound &&
    a.speech.rate === b.speech.rate &&
    a.speech.voiceGender === b.speech.voiceGender &&
    a.speech.voiceURIs["zh-TW"] === b.speech.voiceURIs["zh-TW"] &&
    a.speech.voiceURIs["en-US"] === b.speech.voiceURIs["en-US"]
  );
}
