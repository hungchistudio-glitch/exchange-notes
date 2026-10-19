"use client";

import type { HelloSenseKnown } from "@/lib/ai/prompts/helloSense";
import { LANGUAGE_CODES, type LanguageCode } from "@/lib/languages";
import type { LexiconEntry } from "@/lib/lexicon/types";

/* =========================================================
   A word looked up elsewhere, handed to the hello editor

   The search screen's "Send with Yumi" puts the looked-up word here and
   opens /invitations/new?from=lookup, so the editor starts on it without
   looking it up a second time. This tab only, and only the word and its
   translation — what the search screen was already showing.

   Read back as the raw string (stable, for useSyncExternalStore) and
   checked again on the way out: a draft is a suggestion, never trusted.
   ========================================================= */

const KEY = "exchange-notes:hello-draft";

/**
 * The sides a lookup gives a hello, or null when it has no meaning to share:
 * a sentence, a lookup whose translation never came, or one without both
 * languages known.
 */
export function knownFromLookup(entry: LexiconEntry | null | undefined): HelloSenseKnown[] | null {
  if (!entry || entry.translationUnavailable || entry.kind === "sentence") return null;
  if (!entry.termLanguage || !entry.translationLanguage || !entry.term.trim()) return null;
  const known: HelloSenseKnown[] = [{ language: entry.termLanguage, text: entry.term, partOfSpeech: entry.partOfSpeech }];
  if (entry.translation && entry.translationLanguage !== entry.termLanguage) {
    known.push({ language: entry.translationLanguage, text: entry.translation, partOfSpeech: entry.partOfSpeech });
  }
  return known;
}

export function saveHelloDraft(known: HelloSenseKnown[]): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(known.slice(0, LANGUAGE_CODES.length)));
  } catch {
    /* Storage refused: the editor opens on its own lookup instead. */
  }
}

export function readHelloDraftRaw(): string | null {
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function parseHelloDraft(raw: string | null): HelloSenseKnown[] | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return null;
    const seen = new Set<LanguageCode>();
    const known: HelloSenseKnown[] = [];
    for (const side of value.slice(0, LANGUAGE_CODES.length)) {
      const language = (side as { language?: unknown })?.language;
      const text = (side as { text?: unknown })?.text;
      const partOfSpeech = (side as { partOfSpeech?: unknown })?.partOfSpeech;
      if (!LANGUAGE_CODES.includes(language as LanguageCode) || seen.has(language as LanguageCode)) continue;
      if (typeof text !== "string" || !text.trim() || text.length > 80) continue;
      seen.add(language as LanguageCode);
      known.push({
        language: language as LanguageCode,
        text: text.trim(),
        partOfSpeech: typeof partOfSpeech === "string" ? partOfSpeech.slice(0, 40) : null,
      });
    }
    return known.length ? known : null;
  } catch {
    return null;
  }
}
