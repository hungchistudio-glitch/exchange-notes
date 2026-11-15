import type { LanguageCode } from "@/lib/languages";
import type { VocabularyItem } from "@/lib/types/app";

/* =========================================================
   The week in numbers (Chi, 2026-11-15: 每週回顧卡)

   The last seven days, today included, read from what the reader did:
   words kept, reviews answered and how many were right, Pronunciation Lab
   practice and its average score, the days with any of it, the run of days
   up to today, and the word they reviewed most. Nothing is estimated; a
   measure with nothing behind it is null.
   ========================================================= */

export type ReviewRow = { vocabulary_item_id: string; grade: string; created_at: string };
export type AttemptRow = { score: number | null; created_at: string };

export type WeekRecap = {
  from: Date;
  to: Date;
  newWords: number;
  totalWords: number;
  reviews: number;
  /** Share of reviews answered good or easy, 0–100. */
  accuracy: number | null;
  labPractice: number;
  labScore: number | null;
  /** Of the seven days, how many had any learning. */
  activeDays: number;
  /** Days in a row with learning, up to today (or yesterday, if today has none yet). */
  streak: number;
  topWord: string | null;
};

const DAY_MS = 86_400_000;

/** A local calendar day, as the reader's own clock counts it. */
export const dayKey = (value: string | number | Date) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export function buildWeekRecap({
  items,
  reviews,
  attempts,
  learning,
  now = Date.now(),
}: {
  items: readonly VocabularyItem[];
  /** The last month's, so the run of days can reach back past the week. */
  reviews: readonly ReviewRow[];
  attempts: readonly AttemptRow[];
  learning: LanguageCode;
  now?: number;
}): WeekRecap {
  const today = new Date(now);
  today.setHours(23, 59, 59, 999);
  const from = new Date(today.getTime() - 7 * DAY_MS + 1);
  const inWeek = (value: string) => {
    const at = Date.parse(value);
    return at >= from.getTime() && at <= today.getTime();
  };

  const weekReviews = reviews.filter((row) => inWeek(row.created_at));
  const right = weekReviews.filter((row) => row.grade === "good" || row.grade === "easy").length;
  const weekAttempts = attempts.filter((row) => inWeek(row.created_at));
  const scores = weekAttempts.flatMap((row) => (typeof row.score === "number" ? [row.score] : []));
  const added = items.filter((item) => inWeek(item.created_at));

  const activeKeys = new Set<string>([
    ...reviews.map((row) => dayKey(row.created_at)),
    ...attempts.map((row) => dayKey(row.created_at)),
    ...items.map((item) => dayKey(item.created_at)),
  ]);

  let activeDays = 0;
  for (let back = 0; back < 7; back++) {
    if (activeKeys.has(dayKey(now - back * DAY_MS))) activeDays += 1;
  }

  let streak = 0;
  let cursor = activeKeys.has(dayKey(now)) ? now : now - DAY_MS;
  while (activeKeys.has(dayKey(cursor))) {
    streak += 1;
    cursor -= DAY_MS;
  }

  const counts = new Map<string, number>();
  for (const row of weekReviews) counts.set(row.vocabulary_item_id, (counts.get(row.vocabulary_item_id) ?? 0) + 1);
  const topId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const top = topId ? items.find((item) => item.id === topId) : undefined;

  return {
    from,
    to: today,
    newWords: added.length,
    totalWords: items.length,
    reviews: weekReviews.length,
    accuracy: weekReviews.length ? Math.round((right / weekReviews.length) * 100) : null,
    labPractice: weekAttempts.length,
    labScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
    activeDays,
    streak,
    topWord: top ? ((top.texts as Record<string, string | undefined>)?.[learning] ?? top.word) : null,
  };
}
