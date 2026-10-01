import "server-only";

import { LANGUAGE_CODES, type LanguageCode } from "@/lib/languages";
import { findObjectWord } from "@/lib/vision/objectLexicon";
import {
  findCoreWord,
  matchesForm,
  type CoreWord,
} from "@/lib/vocabulary/coreLexicon";

/* =========================================================
   The built-in dictionaries, before any model (Chi, 2026-10-01)

   Two kinds of work used to go to Gemini for words the app already knows
   in all five languages: filling a library into a new language
   (/api/vocabulary/translate) and translating a word card in a
   conversation (/api/text-translate). Chi's choice: ask the dictionary
   first — the built-in five-language one (coreLexicon.ts) and the camera's
   object words (lib/vision/objectLexicon.ts) — and send only what it does
   not know.

   Both take the word exactly as written. The lookup's plural guess
   ("shoes" → "shoe") is right for a card that says what a word means, and
   wrong for a translation that has to say the same thing: "chats" is
   "gatos", not "gato". A word the dictionary does not hold as written goes
   to the model, as before.
   ========================================================= */

type BuiltinWord = Pick<CoreWord, "partOfSpeech" | "forms">;

/** The entry this text is, exactly as written, in either dictionary. */
export function findBuiltinWord(
  text: string,
  language: LanguageCode,
): BuiltinWord | null {
  const core = findCoreWord(text, language, { inflected: false });
  if (core) return core;

  const object = findObjectWord(text, language);
  if (!object) return null;

  return {
    partOfSpeech: "noun",
    forms: Object.fromEntries(
      LANGUAGE_CODES.map((code) => [code, [object[code]] as const]),
    ) as Record<string, readonly string[]> as Record<LanguageCode, readonly string[]>,
  };
}

/** The dictionary's word for `text` in `to`, or null when it has none. */
export function builtinTranslation(
  text: string,
  from: LanguageCode,
  to: LanguageCode,
): string | null {
  if (from === to) return null;
  return findBuiltinWord(text, from)?.forms[to][0] ?? null;
}

const TYPED_PARTS = new Set(["noun", "verb", "adjective"]);

/**
 * The target-language form for a word known in other languages — only when
 * every language it is known in names the same dictionary entry.
 *
 * A library word is often two words at once ("cold" with 感冒 beside it is
 * the illness, not the weather), and the reader's own pairing is the only
 * thing that says which. So an entry is used only if all of the word's
 * known forms are forms of it, and its part of speech does not contradict
 * the one stored with the word. Anything less certain goes to the model,
 * which can read the pair.
 */
export function builtinFill(
  known: ReadonlyArray<{ language: LanguageCode; text: string }>,
  target: LanguageCode,
  partOfSpeech?: string | null,
): string | null {
  for (const { language, text } of known) {
    if (language === target) continue;

    const word = findBuiltinWord(text, language);
    if (!word) continue;

    if (
      partOfSpeech &&
      TYPED_PARTS.has(partOfSpeech) &&
      TYPED_PARTS.has(word.partOfSpeech) &&
      partOfSpeech !== word.partOfSpeech
    ) {
      continue;
    }

    const agrees = known.every((other) =>
      matchesForm(word.forms[other.language], other.text, other.language),
    );

    if (agrees) return word.forms[target][0];
  }

  return null;
}
