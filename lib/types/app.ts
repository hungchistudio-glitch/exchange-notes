import type { ByLanguage, LanguageCode } from "@/lib/languages";
import type {
  LanguageMetadataSource,
  LanguagePairAtCreation,
} from "@/lib/vocabulary/languageIdentity";

/**
 * The learning-language axis as the database currently stores it.
 *
 * This is the *storage encoding*, not the language model: profiles'
 * native_language / learning_language columns carry these exact strings
 * under a CHECK constraint that only permits these two. New code should
 * take `LanguageCode` (lib/languages.ts) and convert at the database edge
 * with toLanguageCode / toAppLanguage; this type shrinks to a deprecated
 * alias once the column is widened and backfilled.
 */
export type AppLanguage = "english" | "traditional-chinese";

export type Profile = {
  id: string;
  display_name: string;
  exchange_id: string;
  avatar_url: string | null;
  native_language: AppLanguage;
  learning_language: AppLanguage;
  city: string | null;
  discoverable: boolean;
};

export type VocabularyStatus = "new" | "learning" | "mastered";

export type VocabularyCategory = "people" | "objects" | "actions" | "other";

export type VocabularyCollection = {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  color: string;
  created_at: string;
  updated_at: string;
  word_count?: number;
};

export type VocabularyItem = {
  id: string;
  user_id: string;
  word: string;
  translation: string;
  /**
   * Legacy: the language of `word`, as stored. Superseded by the pair below,
   * which names both halves instead of leaving the second one implied by
   * there being only two languages.
   *
   * Typed as stored rather than as a union, because it is written by one
   * place now (the repository, from word_language) and read by none. It goes
   * when the column does.
   */
  language: string;
  /**
   * The pair, stated outright. Present on every row and returned by the
   * `select("*")` reads, so they are not optional — the database backfilled
   * them and holds them NOT NULL.
   */
  word_language: LanguageCode;
  translation_language: LanguageCode;
  /**
   * How those two languages were arrived at, and how sure the app was.
   *
   * Provenance, not content. Nothing renders a word differently because of
   * them — they exist so a guessed language can be told apart from a stated
   * one, and so the card can offer to be corrected instead of quietly
   * carrying a wrong answer forever.
   *
   * Optional because rows read back from a client that predates the columns,
   * and drafts written offline, may not carry them. Absent means "not
   * recorded", which readers treat as legacy rather than as a value.
   */
  language_source?: LanguageMetadataSource | null;
  language_confidence?: number | null;
  language_pair_at_creation?: LanguagePairAtCreation | null;
  needs_language_review?: boolean | null;
  /**
   * The word, and its example, in every language it is known in.
   *
   * This is what a saved word actually is now — one concept, not a pair. The
   * four fields above are the pair it was stored as before, kept while
   * readers migrate and derived from these afterwards. A language present in
   * `texts` but absent from `examples` simply has no example yet.
   */
  texts: ByLanguage;
  examples: ByLanguage;
  category: VocabularyCategory;
  favorite: boolean;
  part_of_speech: string | null;
  example_sentence: string | null;
  translated_example: string | null;
  image_url: string | null;
  /**
   * The two derivatives a visual capture produced, and the target rectangle
   * relating them. Null for every word saved before the media pipeline, and
   * for every word that never came from a picture — see lib/media/record.ts,
   * which is also the only thing that should parse this.
   */
  media?: unknown;
  confidence: "high" | "medium" | "low" | null;
  status: VocabularyStatus;
  created_at: string;
  updated_at: string;
  next_review_at?: string | null;
  last_reviewed_at?: string | null;
  review_interval?: number | null;
  review_ease?: number | null;
  review_count?: number | null;
  correct_count?: number | null;
  review_repetitions?: number | null;
  review_lapses?: number | null;
  retention_score?: number | null;
  difficulty?: "easy" | "medium" | "hard" | null;
};