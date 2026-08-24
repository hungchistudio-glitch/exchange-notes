"use client";

import { matchKey } from "@/lib/lexicon/normalize";
import type { LanguageCode } from "@/lib/languages";
import type { LexiconEntry } from "@/lib/lexicon/types";
import { isLexiconEntry } from "@/lib/lexicon/types";

/* =========================================================
   The answers this device already has

   Three caches sit between a reader and a model call — this one, the
   route's in-memory map, and the shared table — and this is the only one
   that can answer without a network at all. It is also the only one that
   is wrong in a way the reader would notice, so its key carries everything
   the answer depends on.

   v4, and each previous store is abandoned rather than migrated. A v2 entry
   is the answer to a question that could only be asked in the reader's own
   pair. A v3 entry is the answer from before the card learned to lead in the
   language being studied — it would hand a French learner a Chinese headword
   glossed in English. Those are different answers, not older spellings of
   this one.
   ========================================================= */

const STORE_KEY = "exchange-notes-lexicon-v4";
const MAX_ITEMS = 200;
const TTL_MS = 90 * 24 * 60 * 60 * 1000;

type StoredEntry = {
  savedAt: number;
  entry: LexiconEntry;
};

type Store = Record<string, StoredEntry>;

export type LexiconCacheKeyParts = {
  query: string;
  pair: readonly [LanguageCode, LanguageCode];
  /**
   * The reader's first language.
   *
   * In the key because it changes the answer, not just the presentation: it
   * is what decides whether a query is "what does this mean" or "what is this
   * in the language I study", and those come back as different cards. Two
   * readers with the same pair and different first languages asking about 爸爸
   * must not be served each other's answer.
   */
  native?: LanguageCode | null;
  /** Set only when the reader pinned the language for this query. */
  chosen?: LanguageCode | null;
};

/**
 * What makes two lookups the same lookup.
 *
 * The pair is in here because a lookup is not a fact about a word, it is a
 * card: a headword in one language glossed in another. Ask for "mow" while
 * learning French and the answer is *tondre*; switch to English and the same
 * three letters have to come back as an English word. Keyed on the query
 * alone the first card was handed straight back, in a language the reader had
 * just stopped learning, and no amount of switching would shift it until the
 * entry aged out ninety days later.
 *
 * The pin is in here because "no, that is Italian" is a different question
 * about the same eight letters, and it deserves its own answer rather than
 * overwriting the unpinned one.
 */
export function lexiconCacheKey({
  query,
  pair,
  native,
  chosen,
}: LexiconCacheKeyParts): string {
  const first = native && native !== pair[1] ? `~${native}` : "";

  return `${pair[0]}>${pair[1]}${first}${
    chosen ? `@${chosen}` : ""
  }:${matchKey(query)}`;
}

function readStore(): Store {
  if (typeof window === "undefined") return {};

  try {
    const value = window.localStorage.getItem(STORE_KEY);
    if (!value) return {};

    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // Safari private mode and managed WebViews can reject localStorage
    // writes. A cache that cannot be written is not a failed lookup.
  }
}

export function readCachedEntry(
  parts: LexiconCacheKeyParts,
): LexiconEntry | null {
  const key = lexiconCacheKey(parts);
  const store = readStore();
  const stored = store[key];

  if (!stored) return null;

  if (Date.now() - stored.savedAt > TTL_MS) {
    delete store[key];
    writeStore(store);
    return null;
  }

  // Re-validated rather than trusted: an entry written by an older shape is
  // discarded here instead of rendering as a card with blank sides.
  return isLexiconEntry(stored.entry) ? stored.entry : null;
}

export function writeCachedEntry(
  parts: LexiconCacheKeyParts,
  entry: LexiconEntry,
): void {
  if (typeof window === "undefined") return;

  const store = readStore();

  store[lexiconCacheKey(parts)] = { savedAt: Date.now(), entry };

  const trimmed = Object.entries(store)
    .sort(([, left], [, right]) => right.savedAt - left.savedAt)
    .slice(0, MAX_ITEMS);

  writeStore(Object.fromEntries(trimmed));
}
