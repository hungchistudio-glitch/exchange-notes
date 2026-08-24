import { DEFAULT_LEARNING_PAIR, isLanguageCode, type LanguageCode } from "@/lib/languages";
import { createClient } from "@/lib/supabase/client";

/* =========================================================
   Review words carry their own languages

   This used to hand the review screen `english` and `chinese`, and the
   screen believed it: the prompt was spoken with a zh-TW voice and the
   answer with an en-US one, hard-coded, for every card in the queue. A
   French word read aloud by a Mandarin voice is not an accent, it is a
   different word, and no amount of repetition teaches the right one.

   So a review word says what language each of its two sides is in, read off
   the row rather than assumed, and the screen speaks each side with the
   voice that side is actually in.
   ========================================================= */

export type ReviewWord = {
  id: string;
  /** The headword, in the language the row was saved in. */
  term: string;
  termLanguage: LanguageCode;
  /** Its gloss, in the language the row was glossed in. */
  translation: string;
  translationLanguage: LanguageCode;
  termExample?: string | null;
  translationExample?: string | null;
};

type VocabularyRow = Record<string, unknown>;

function optionalString(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized || null;
}

function requiredString(
  value: unknown,
): string {
  return optionalString(value) ?? "";
}

/**
 * A language code off a row, or the pair's own default.
 *
 * Every row in the table has carried both codes since the axis widening, so
 * the fallback is for a row read back mid-migration rather than for an
 * expected case — and it falls back to the pair the app has always taught
 * rather than to whatever the reader is studying now, which would be the
 * exact mistake this file exists to stop making.
 */
function languageOf(value: unknown, fallback: LanguageCode): LanguageCode {
  return isLanguageCode(value) ? value : fallback;
}

function mapReviewWord(
  row: VocabularyRow,
): ReviewWord {
  const termLanguage = languageOf(
    row.word_language,
    DEFAULT_LEARNING_PAIR[0],
  );

  const translationLanguage = languageOf(
    row.translation_language,
    DEFAULT_LEARNING_PAIR[1],
  );

  /*
   * The map first, the pair as the fallback — the same order the vocabulary
   * cards read in, so a word looks and sounds the same in review as it does
   * in the list it came from.
   */
  const texts = (row.texts ?? {}) as Partial<Record<LanguageCode, string>>;
  const examples = (row.examples ?? {}) as Partial<
    Record<LanguageCode, string>
  >;

  return {
    id: requiredString(row.id),

    term:
      optionalString(texts[termLanguage]) ?? requiredString(row.word),
    termLanguage,

    translation:
      optionalString(texts[translationLanguage]) ??
      requiredString(row.translation),
    translationLanguage,

    termExample:
      optionalString(examples[termLanguage]) ??
      optionalString(row.example_sentence),

    translationExample:
      optionalString(examples[translationLanguage]) ??
      optionalString(row.translated_example),
  };
}

function cleanReviewWords(
  rows: VocabularyRow[],
): ReviewWord[] {
  return rows
    .map(mapReviewWord)
    .filter(
      (word) =>
        Boolean(
          word.id &&
            word.term &&
            word.translation,
        ),
    );
}

async function getCurrentUserId() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    supabase,
    userId: user?.id ?? null,
  };
}

export async function getTodaysReview(): Promise<
  ReviewWord[]
> {
  const { supabase, userId } =
    await getCurrentUserId();

  if (!userId) {
    return [];
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("vocabulary_items")
    .select("*")
    .eq("user_id", userId)
    .lte("next_review_at", now)
    .order("next_review_at", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return cleanReviewWords(
    (data ?? []) as VocabularyRow[],
  );
}

export async function getAllReviewWords(): Promise<
  ReviewWord[]
> {
  const { supabase, userId } =
    await getCurrentUserId();

  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from("vocabulary_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return cleanReviewWords(
    (data ?? []) as VocabularyRow[],
  );
}
