export type VocabularyItem = {
  id: string;
  user_id: string;
  word: string;
  translation: string;
  example_sentence: string | null;
  translated_example: string | null;
  part_of_speech: string | null;
  category: string | null;
  status: string | null;
  review_count: number | null;
  correct_count: number | null;
  review_interval: number | null;
  review_ease: number | null;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  created_at: string;
};

export function formatVocabularyDate(
  value: string | null,
  fallback = "Ready to review",
) {
  if (!value) return fallback;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
