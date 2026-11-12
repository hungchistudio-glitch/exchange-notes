import type { LanguageCode } from "@/lib/languages";
import type { VocabularyMedia } from "@/lib/media/record";
import type { VocabularyCategory, VocabularyItem } from "@/lib/types/app";
import type { VocabularyLanguageIdentity } from "@/lib/vocabulary/languageIdentity";

/*
 * The row a new word becomes, built in one place for both doors into the
 * table: the app's (createVocabularyEntry, on the device) and Yumi Pocket
 * Lookup's share extension (/api/pocket/save, on the server; Chi,
 * 2026-11-12). A word saved from either is the same row, so nothing that
 * reads the table can tell where it came from by its shape.
 */

export type VocabularyRowInput = {
  userId: string;
  term: string;
  translation: string;
  partOfSpeech?: string | null;
  termExample?: string | null;
  translationExample?: string | null;
  imageUrl?: string | null;
  media?: VocabularyMedia | null;
  confidence?: VocabularyItem["confidence"];
  category?: VocabularyCategory;
  status?: VocabularyItem["status"];
};

export function byLanguage(
  entries: ReadonlyArray<readonly [LanguageCode, string | null | undefined]>,
): Partial<Record<LanguageCode, string>> {
  const out: Partial<Record<LanguageCode, string>> = {};

  for (const [code, value] of entries) {
    const text = value?.trim();
    if (text) out[code] = text;
  }

  return out;
}

/** The insert payload for a new word whose languages have been resolved. */
export function buildVocabularyRow(input: VocabularyRowInput, identity: VocabularyLanguageIdentity) {
  const term = input.term.trim();
  const translation = input.translation.trim();
  const termExample = input.termExample?.trim() || null;
  const translationExample = input.translationExample?.trim() || null;

  return {
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
    next_review_at: new Date().toISOString(),
  };
}
