import type { LanguageCode } from "@/lib/languages";

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
   * Legacy: the language of `word`, in the prose encoding. Superseded by the
   * pair below, which names both halves instead of leaving the second one
   * implied by there being only two languages. Every writer still sets it.
   */
  language: AppLanguage;
  /**
   * The pair, stated outright. Present on every row and returned by the
   * `select("*")` reads, so they are not optional — the database backfilled
   * them and holds them NOT NULL.
   */
  word_language: LanguageCode;
  translation_language: LanguageCode;
  category: VocabularyCategory;
  favorite: boolean;
  part_of_speech: string | null;
  example_sentence: string | null;
  translated_example: string | null;
  image_url: string | null;
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

export type MessageType = "text" | "image" | "vocabulary" | "grammar";
