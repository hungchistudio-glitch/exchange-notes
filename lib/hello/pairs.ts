import { LANGUAGE_CODES, SUPPORTED_PROFILE_LANGUAGE_PAIRS, isLanguageCode, type LanguageCode } from "@/lib/languages";

import type { HelloPair, HelloSense } from "./types";

/* =========================================================
   Two languages, kept apart from everything else

   Three language settings meet on a hello, and none may overwrite another:

     interface   the visitor's own: buttons, hints and errors
     original    the sharer's two, saved with the hello
     viewer      the visitor's two for this visit only

   This is the second and third. The interface language never appears
   here: changing it must not change the card.

   Any two different languages of the five, in either order — the 20 the
   app already teaches (SUPPORTED_PROFILE_LANGUAGE_PAIRS).
   ========================================================= */

export const HELLO_LANGUAGES: readonly LanguageCode[] = LANGUAGE_CODES;

export const HELLO_PAIRS: readonly HelloPair[] = SUPPORTED_PROFILE_LANGUAGE_PAIRS;

export function isValidPair(pair: readonly unknown[]): pair is HelloPair {
  return (
    pair.length === 2 &&
    isLanguageCode(pair[0]) &&
    isLanguageCode(pair[1]) &&
    pair[0] !== pair[1]
  );
}

/**
 * The pair a sharer starts from: what they are learning, then their own
 * language. Null when that is not two different languages — the profile is
 * incomplete — so the editor asks rather than guessing a mother tongue.
 */
export function defaultPair(
  learning: LanguageCode | null | undefined,
  native: LanguageCode | null | undefined,
): HelloPair | null {
  const candidate = [learning, native];
  return isValidPair(candidate) ? (candidate as unknown as HelloPair) : null;
}

/** A, B → B, A: the words and their sounds go with their languages. */
export function swapPair(pair: HelloPair): HelloPair {
  return [pair[1], pair[0]];
}

/**
 * One slot set to a language. The other slot's language cannot be chosen
 * (the menus disable it), so this refuses it rather than silently
 * swapping: a pair only ever changes the way the reader asked.
 */
export function setSlot(pair: HelloPair, slot: 0 | 1, language: LanguageCode): HelloPair {
  if (!HELLO_LANGUAGES.includes(language)) return pair;
  const other = pair[slot === 0 ? 1 : 0];
  if (language === other) return pair;
  return slot === 0 ? [language, pair[1]] : [pair[0], language];
}

export function samePair(a: HelloPair, b: HelloPair): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/** The languages a slot may take: all but the other slot's. */
export function choicesFor(pair: HelloPair, slot: 0 | 1): Array<{ language: LanguageCode; disabled: boolean }> {
  const other = pair[slot === 0 ? 1 : 0];
  return HELLO_LANGUAGES.map((language) => ({ language, disabled: language === other }));
}

/** Which languages of the sense are still missing. */
export function missingLanguages(sense: HelloSense): LanguageCode[] {
  return HELLO_LANGUAGES.filter((language) => !sense[language]?.text?.trim());
}

/* ── A visitor's two, for this visit ───────────────────────────────── */

export type ViewerPairState = {
  /** The sharer's, as saved: what "back to the original" returns to. */
  original: HelloPair;
  /** What the visitor is looking at now. */
  current: HelloPair;
};

export type ViewerPairAction =
  | { type: "set"; slot: 0 | 1; language: LanguageCode }
  | { type: "swap" }
  | { type: "restore" };

/** A visit starts exactly as the sharer made it. */
export function initialViewerPair(original: HelloPair): ViewerPairState {
  return { original, current: original };
}

export function viewerPairReducer(state: ViewerPairState, action: ViewerPairAction): ViewerPairState {
  switch (action.type) {
    case "set":
      return { ...state, current: setSlot(state.current, action.slot, action.language) };
    case "swap":
      return { ...state, current: swapPair(state.current) };
    case "restore":
      return { ...state, current: state.original };
  }
}

export function isOriginal(state: ViewerPairState): boolean {
  return samePair(state.current, state.original);
}
