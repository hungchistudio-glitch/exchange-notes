"use client";

import type { LanguageCode } from "@/lib/languages";
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

  confidence?: VocabularyItem["confidence"];
  category?: VocabularyCategory;
  status?: VocabularyItem["status"];

  /** Everything the caller knows about which languages these are. */
  language: Omit<LanguageIdentityRequest, "term" | "translation">;
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
    confidence: input.confidence ?? "medium",
    category: input.category ?? "other",
    status: input.status ?? "new",
  });

  return { item: inserted as VocabularyItem, identity };
}
