import "server-only";

import type { LanguageCode } from "@/lib/languages";
import { BUILTIN_IPA_DATA } from "@/lib/pronunciation/builtinIpaData";

/* =========================================================
   IPA the app already has (Chi, 2026-10-03: "混合來源")

   Every word in the built-in dictionary has its transcription on this
   server: English from the CMU Pronouncing Dictionary, Spanish by rule,
   French and Italian written once and checked line by line
   (scripts/builtin-ipa/generate.mjs). A word card for one of those ~4,000
   words used to wait on the phonetics cache and then on dictionaryapi.dev
   or a model; now it is answered here, offline, for nothing — and the model
   is left for the words the app does not know.

   Matched as written, then ignoring case and the typographic apostrophe
   ("L’eau" is "l'eau"). Never a guess from a different form: "chats" is
   not "chat", and an IPA for the wrong form is worse than none.
   ========================================================= */

type IpaLanguage = keyof typeof BUILTIN_IPA_DATA;

const tables = new Map<IpaLanguage, Map<string, string>>();

function fold(text: string): string {
  return text.normalize("NFC").trim().replace(/[’ʼ]/g, "'").toLowerCase();
}

function table(language: IpaLanguage): Map<string, string> {
  let found = tables.get(language);
  if (found) return found;

  found = new Map();
  for (const line of BUILTIN_IPA_DATA[language].split("\n")) {
    const bar = line.indexOf("|");
    if (bar <= 0) continue;
    const key = fold(line.slice(0, bar));
    // The first form listed wins, as it does in the dictionary itself.
    if (!found.has(key)) found.set(key, line.slice(bar + 1));
  }
  tables.set(language, found);
  return found;
}

function isIpaLanguage(language: LanguageCode): language is IpaLanguage {
  return language in BUILTIN_IPA_DATA;
}

/** The built-in transcription of `text`, "/…/", or null if there is none. */
export function builtinIpa(
  text: string | null | undefined,
  language: LanguageCode | null | undefined,
): string | null {
  if (!text?.trim() || !language || !isIpaLanguage(language)) return null;
  return table(language).get(fold(text)) ?? null;
}
