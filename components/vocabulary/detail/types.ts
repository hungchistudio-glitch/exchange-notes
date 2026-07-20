import type { VocabularyItem } from "@/lib/types/app";

export type { VocabularyItem };

export function formatVocabularyDate(
  value: string | null | undefined,
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
