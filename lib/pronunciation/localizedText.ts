import {
  DEFAULT_INTERFACE_LANGUAGE,
  type InterfaceLanguage,
} from "@/lib/appPreferences";

// Pronunciation guidance/tip content needs to follow the app's interface
// language (not just be bundled in Traditional Chinese) — a user with
// appLanguage set to English should see "HOW TO SAY IT" instructions in
// English too, not just English-language UI chrome around Chinese teaching
// text.
//
// Partial, not complete. The Pronunciation Lab is 26 English letters and the
// zhuyin symbols: teaching material written for one specific pair of
// languages rather than a frame any language drops into. Requiring every
// interface language to carry all 207 of these strings would mean a third
// interface language could not ship until someone had written a full course
// in it — and a course that is not written is better answered with the one
// that is than with a blank screen.
export type LocalizedText = Partial<Record<InterfaceLanguage, string>>;

/**
 * The text in the reader's language, or the closest thing that exists.
 *
 * Falls back to the default interface language rather than to the first
 * entry: on a screen teaching pronunciation, English instructions are a
 * usable answer for a Spanish reader in a way that Chinese ones are not.
 * The last resort is any entry at all, so nothing renders blank.
 */
export function localize(
  value: LocalizedText,
  language: InterfaceLanguage,
): string {
  return (
    value[language] ??
    value[DEFAULT_INTERFACE_LANGUAGE] ??
    Object.values(value).find((text) => typeof text === "string" && text) ??
    ""
  );
}
