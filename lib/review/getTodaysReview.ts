import { createClient } from "@/lib/supabase/client";

export type ReviewWord = {
  id: string;
  english: string;
  chinese: string;
  englishExample?: string | null;
  chineseExample?: string | null;
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

function mapReviewWord(
  row: VocabularyRow,
): ReviewWord {
  return {
    id: requiredString(row.id),

    english: requiredString(
      row.english ??
        row.word ??
        row.english_name,
    ),

    chinese: requiredString(
      row.chinese ??
        row.translation ??
        row.traditional_chinese ??
        row.traditional_chinese_name,
    ),

    englishExample: optionalString(
      row.example_sentence ??
        row.english_example ??
        row.englishExample ??
        row.example_sentence_en ??
        row.english_example_sentence ??
        row.example,
    ),

    chineseExample: optionalString(
      row.translated_example ??
        row.chinese_example ??
        row.chineseExample ??
        row.example_sentence_zh ??
        row.example_sentence_zh_tw ??
        row.traditional_chinese_example ??
        row.traditionalChineseExample ??
        row.traditional_chinese_example_sentence,
    ),
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
            word.english &&
            word.chinese,
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
