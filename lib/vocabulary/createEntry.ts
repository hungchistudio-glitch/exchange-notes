"use client";

import type { LanguageCode } from "@/lib/languages";
import type { VocabularyMedia } from "@/lib/media/record";
import { findDuplicate } from "@/lib/lexicon/personal";
import { applyPending, readMirror, readOutbox } from "@/lib/offline/vocabulary";
import type { VocabularyCategory, VocabularyItem } from "@/lib/types/app";
import {
  resolveLanguageIdentity,
  type LanguageIdentityRequest,
  type VocabularyLanguageIdentity,
} from "@/lib/vocabulary/languageIdentity";
import { insertVocabulary } from "@/lib/vocabulary/repository";

/* =========================================================
   One door into the vocabulary table

   Nine places could save a word — a photo, a menu, a message, a shared card,
   a text selection, the lookup sheet, the Cosmic console, the news drawer,
   the search box — and each of them used to assemble its own insert payload.
   Which meant each of them decided, independently and invisibly, what
   language the word was in. Nine chances to get it wrong, and no single
   place to fix it.

   They all come through here now. The languages are resolved once, by one
   ordering of the evidence, and recorded with a note saying how they were
   arrived at. A tenth entry point gets that for free; it cannot even express
   a row without it, because the payload type will not build.
   ========================================================= */

export type CreateVocabularyEntryInput = {
  userId: string;

  /** The headword, in whatever language it is in. */
  term: string;
  /** Its gloss. May be empty where a lookup could not produce one. */
  translation: string;

  partOfSpeech?: string | null;
  termExample?: string | null;
  translationExample?: string | null;
  imageUrl?: string | null;

  /**
   * What a visual capture produced, from lib/media/assets' commitCapture.
   *
   * Optional, and stays optional. A word typed into the search box has no
   * picture and never will; the spec is explicit that a target image is
   * never made mandatory, and the type says so.
   */
  media?: VocabularyMedia | null;

  confidence?: VocabularyItem["confidence"];
  category?: VocabularyCategory;
  status?: VocabularyItem["status"];

  /** Everything the caller knows about which languages these are. */
  language: Omit<LanguageIdentityRequest, "term" | "translation">;

  /**
   * The reader's library, when the caller already holds it.
   *
   * Only an optimisation: the duplicate check falls back to the device's
   * own mirror when this is absent, so a caller that does not have the list
   * is checked just as thoroughly, one IndexedDB read more slowly.
   */
  knownItems?: readonly VocabularyItem[];

  /**
   * Saves even if this word is already in the library.
   *
   * For the one case where the reader has been shown the existing card and
   * asked for a second one anyway. Never a default — see the note on
   * DuplicateVocabularyError.
   */
  allowDuplicate?: boolean;
};

export type CreateVocabularyEntryResult = {
  item: VocabularyItem;
  identity: VocabularyLanguageIdentity;
};

/** A word with nothing in it is not a word. */
export class EmptyVocabularyTermError extends Error {
  constructor() {
    super("A vocabulary entry needs a term.");
    this.name = "EmptyVocabularyTermError";
  }
}

/**
 * This word is already here, and here is the card.
 *
 * Thrown rather than returned so that no caller can accidentally ignore it —
 * a save that quietly did nothing is indistinguishable, from the reader's
 * side, from a save that worked, and they find out weeks later when the same
 * word comes round twice in review with two different review histories.
 *
 * Carries the existing row because every sensible thing a screen can do next
 * needs it: open it, say when it was saved, offer to review it.
 */
export class DuplicateVocabularyError extends Error {
  readonly existing: VocabularyItem;

  constructor(existing: VocabularyItem) {
    super("That word is already in your vocabulary.");
    this.name = "DuplicateVocabularyError";
    this.existing = existing;
  }
}

/**
 * The library as this device knows it, for the duplicate check.
 *
 * The mirror plus the outbox, which is what the reader actually has —
 * including a word saved on a train that the server has not been told about
 * yet. Checking the server instead would let that word be saved twice.
 *
 * An empty mirror means this device has never synced, and the check is
 * skipped rather than failing the save: a duplicate is a nuisance, a word
 * the reader could not save at all is worse.
 */
async function readKnownItems(userId: string): Promise<VocabularyItem[]> {
  try {
    const [mirror, pending] = await Promise.all([
      readMirror(userId),
      readOutbox(),
    ]);

    return applyPending(mirror, pending);
  } catch {
    return [];
  }
}

function byLanguage(
  entries: ReadonlyArray<readonly [LanguageCode, string | null | undefined]>,
): Partial<Record<LanguageCode, string>> {
  const out: Partial<Record<LanguageCode, string>> = {};

  for (const [code, value] of entries) {
    const text = value?.trim();
    if (text) out[code] = text;
  }

  return out;
}

/**
 * Saves a word, having first worked out what language it is in.
 *
 * Returns the identity alongside the row so a caller can act on a low
 * confidence — offering the reader the choice rather than filing the word
 * under a guess and moving on. Nothing here blocks on that: the word is
 * saved either way, because a word the reader meant to keep should not be
 * lost to a question about its language.
 */
export async function createVocabularyEntry(
  input: CreateVocabularyEntryInput,
): Promise<CreateVocabularyEntryResult> {
  const term = input.term?.trim() ?? "";
  const translation = input.translation?.trim() ?? "";

  if (!term) throw new EmptyVocabularyTermError();

  const identity = resolveLanguageIdentity({
    ...input.language,
    term,
    translation,
  });

  /*
   * Checked after the languages are resolved, because the language is half
   * the question. "Come" is an English verb and an Italian conjunction, and a
   * duplicate check keyed on the spelling alone refuses to save the second
   * one — which is the failure that loses data rather than merely duplicating
   * it.
   */
  if (!input.allowDuplicate) {
    const library = input.knownItems ?? (await readKnownItems(input.userId));
    const existing = findDuplicate(library, term, identity.termLanguage);

    if (existing) throw new DuplicateVocabularyError(existing);
  }

  const termExample = input.termExample?.trim() || null;
  const translationExample = input.translationExample?.trim() || null;

  const inserted = await insertVocabulary({
    user_id: input.userId,
    word: term,
    translation,

    word_language: identity.termLanguage,
    translation_language: identity.translationLanguage,
    language_source: identity.source,
    language_confidence: identity.confidence,
    language_pair_at_creation: identity.pairAtCreation,
    needs_language_review: identity.needsReview,

    /*
     * The map is written at birth rather than backfilled later.
     *
     * A row is one concept known in N languages; starting it with the two it
     * was born knowing means every reader of `texts` — search, the language
     * fill, the pronunciation lab — sees the same shape for a word saved
     * today as for one migrated last week.
     */
    texts: byLanguage([
      [identity.termLanguage, term],
      [identity.translationLanguage, translation],
    ]),
    examples: byLanguage([
      [identity.termLanguage, termExample],
      [identity.translationLanguage, translationExample],
    ]),

    part_of_speech: input.partOfSpeech?.trim() || null,
    example_sentence: termExample,
    translated_example: translationExample,
    image_url: input.imageUrl ?? null,
    media: input.media ?? null,
    confidence: input.confidence ?? "medium",
    category: input.category ?? "other",
    status: input.status ?? "new",
  });

  return { item: inserted as VocabularyItem, identity };
}
