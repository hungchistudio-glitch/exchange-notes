import type { InterfaceLanguage } from "@/lib/appPreferences";

// Pronunciation guidance/tip content needs to follow the app's interface
// language (not just be bundled in Traditional Chinese) — a user with
// appLanguage set to English should see "HOW TO SAY IT" instructions in
// English too, not just English-language UI chrome around Chinese teaching
// text. This is a plain per-language string map keyed by the same
// InterfaceLanguage union useTranslation()'s `language` already returns, so
// callers can do `localized[language]` directly with no extra mapping step.
export type LocalizedText = Record<InterfaceLanguage, string>;

export function localize(value: LocalizedText, language: InterfaceLanguage): string {
  return value[language];
}
