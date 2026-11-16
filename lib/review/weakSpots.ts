import type { ProgressByUnit } from "@/lib/pronunciation/lab/types";
import { calculateRetention } from "@/lib/review/sm2";
import type { VocabularyItem } from "@/lib/types/app";

/* =========================================================
   Where a reader is weakest (Chi, 2026-11-15: 弱點雷達)

   Five measures, each 0 to 100, drawn as a radar on the review page, and
   the words and sounds behind the low ones, with a key that practises just
   those. Every number is read from what the reader has done; an axis with
   nothing to measure yet is null and drawn as such, never a guess.

   - recall: of every answer given in review, the share that was right.
   - retention: how much of what was reviewed is likely still remembered
     (calculateRetention, the review's own forgetting curve).
   - listening and speaking: the Pronunciation Lab's own scores, averaged
     over the sounds practised.
   - growth: words kept in the last seven days, against two a day.
   ========================================================= */

export type AxisId = "recall" | "retention" | "listening" | "speaking" | "growth";
export type Axis = { id: AxisId; value: number | null };

export const AXES: readonly AxisId[] = ["recall", "retention", "listening", "speaking", "growth"];

const DAY_MS = 86_400_000;
/** Two new words a day is a full growth axis. */
const GROWTH_PER_WEEK = 14;
/** How many weak words the panel names and practises. */
export const WEAK_WORDS = 8;
export const WEAK_SOUNDS = 4;

const average = (values: number[]) =>
  values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;

export function skillAxes(
  items: readonly VocabularyItem[],
  progress: ProgressByUnit | null,
  now = Date.now(),
): Axis[] {
  const reviewed = items.filter((item) => (item.review_count ?? 0) > 0);
  const answers = reviewed.reduce((sum, item) => sum + (item.review_count ?? 0), 0);
  const right = reviewed.reduce((sum, item) => sum + (item.correct_count ?? 0), 0);
  const practised = Object.values(progress ?? {}).filter((unit) => (unit?.attempts ?? 0) > 0);
  const added = items.filter((item) => now - Date.parse(item.created_at) < 7 * DAY_MS).length;

  const values: Record<AxisId, number | null> = {
    recall: answers ? Math.round((Math.min(right, answers) / answers) * 100) : null,
    retention: reviewed.length ? average(reviewed.map((item) => calculateRetention(item, new Date(now)))) : null,
    listening: average(practised.flatMap((unit) => (unit?.listeningScore === undefined ? [] : [unit.listeningScore]))),
    speaking: average(practised.flatMap((unit) => (unit?.speakingScore === undefined ? [] : [unit.speakingScore]))),
    growth: items.length ? Math.min(100, Math.round((added / GROWTH_PER_WEEK) * 100)) : null,
  };

  return AXES.map((id) => ({ id, value: values[id] }));
}

/** The lowest measured axis, if any is measured. */
export function weakestAxis(axes: readonly Axis[]): Axis | null {
  return axes.reduce<Axis | null>(
    (lowest, axis) => (axis.value !== null && (lowest === null || axis.value < (lowest.value ?? 101)) ? axis : lowest),
    null,
  );
}

/**
 * The words a reader keeps losing: forgotten after being learned (lapses),
 * last answered "again" or "hard", or likely fading now. A word never
 * reviewed is not weak, only new.
 */
export function weakWords(items: readonly VocabularyItem[], now = Date.now(), limit = WEAK_WORDS): VocabularyItem[] {
  return items
    .filter((item) => (item.review_count ?? 0) > 0)
    .map((item) => {
      const grade = (item as VocabularyItem & { last_review_grade?: string | null }).last_review_grade;
      const score =
        (item.review_lapses ?? 0) * 2
        + (grade === "again" ? 3 : grade === "hard" ? 1 : 0)
        + (100 - calculateRetention(item, new Date(now))) / 50;
      return { item, score };
    })
    .filter(({ score }) => score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
}

export type WeakSound = { unitId: string; score: number };

/** The practised sounds with the lowest scores, weakest first. */
export function weakSounds(progress: ProgressByUnit | null, limit = WEAK_SOUNDS): WeakSound[] {
  return Object.values(progress ?? {})
    .flatMap((unit) => {
      if (!unit || (unit.attempts ?? 0) === 0) return [];
      const scores = [unit.listeningScore, unit.speakingScore, unit.accuracyScore].filter(
        (value): value is number => typeof value === "number",
      );
      const score = scores.length
        ? Math.min(...scores)
        : Math.round(((unit.correctAttempts ?? 0) / Math.max(1, unit.attempts ?? 1)) * 100);
      return unit.mastery === "mastered" ? [] : [{ unitId: unit.unitId, score }];
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}
