import type { VocabularyItem, VocabularyStatus } from "@/lib/types/app";
import type { ReviewGrade } from "@/types/vocabulary";

export type { ReviewGrade } from "@/types/vocabulary";

export type ReviewUpdate = {
  status: VocabularyStatus;
  next_review_at: string;
  last_reviewed_at: string;
  review_interval: number;
  review_ease: number;
  review_count: number;
  correct_count: number;
  review_repetitions: number;
  review_lapses: number;
  retention_score: number;
};

const DAY_MS = 86_400_000;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function qualityForGrade(grade: ReviewGrade) {
  return { again: 1, hard: 3, good: 4, easy: 5 }[grade];
}

/**
 * The chance this word is still in there, as a percentage.
 *
 * ── Why the curve changed ──────────────────────────────────────────────
 *
 * This used to be `exp(-elapsed / interval)`, which decays to 1/e — 37% — at
 * exactly the interval the scheduler chose. That is the wrong reading by
 * construction: SM-2 picks its interval to land a review while the word is
 * still *mostly* remembered, around nine times in ten. A word reviewed
 * precisely on schedule was therefore reported as barely held, and the panel
 * that showed it said so in the plainest possible terms.
 *
 * The old test for the Cosmic panel is the evidence, and it wrote the bug
 * down in its own comment: two words "last seen one interval ago", expected
 * retention 37%. On schedule is not two-thirds forgotten.
 *
 * Past the interval the old curve fell off a cliff. Five intervals late it
 * reads 0.7%; a word answered wrong is rescheduled ten minutes out, the floor
 * below pins its stability at a quarter of a day, and two days later it reads
 * 0.03% — so a single wrong answer made a word read as gone forever, until it
 * was reviewed again. A library of those averages to zero. That is how a
 * reader with 88% accuracy over 114 reviews was told their memory retention
 * was 0%, which is both false and a miserable thing to be told by something
 * that is supposed to be on your side.
 *
 * ── The curve now ──────────────────────────────────────────────────────
 *
 * `0.9 ^ (elapsed / interval)`: 90% at the scheduled interval, which is the
 * target the schedule was built around, and a decay from there that is honest
 * without being punitive — 81% at twice the interval, 59% at five times, 12%
 * at twenty. The interval is still the only measure of strength there is, so
 * a word held for six days decays six times slower than one held for one.
 *
 * The quarter-day floor stays. It is what keeps a freshly-failed word from
 * dividing by ten minutes, and at this base it gives that word 66% a day
 * later and 43% after two — forgetting, which is what a wrong answer means,
 * rather than erasure.
 */
const TARGET_RETENTION = 0.9;

export function calculateRetention(item: VocabularyItem, now = new Date()) {
  if (!item.last_reviewed_at || !item.review_interval) return 100;
  const elapsedDays = Math.max(
    0,
    (now.getTime() - new Date(item.last_reviewed_at).getTime()) / DAY_MS,
  );
  const stability = Math.max(0.25, item.review_interval);
  return Math.round(
    clamp(TARGET_RETENTION ** (elapsedDays / stability) * 100, 0, 100),
  );
}

export function scheduleSm2(
  item: VocabularyItem,
  grade: ReviewGrade,
  now = new Date(),
): ReviewUpdate {
  const quality = qualityForGrade(grade);
  const previousEase = clamp(item.review_ease ?? 2.5, 1.3, 3.2);
  const previousRepetitions = item.review_repetitions ?? 0;
  const previousInterval = Math.max(0, item.review_interval ?? 0);
  const reviewCount = (item.review_count ?? 0) + 1;
  const correctCount = (item.correct_count ?? 0) + (quality >= 3 ? 1 : 0);
  const lapses = (item.review_lapses ?? 0) + (quality < 3 ? 1 : 0);

  let ease = previousEase;
  let repetitions = previousRepetitions;
  let intervalDays: number;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 10 / 1440;
    ease = clamp(previousEase - 0.2, 1.3, 3.2);
  } else {
    repetitions += 1;
    const adjustment =
      0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    ease = clamp(previousEase + adjustment, 1.3, 3.2);

    if (repetitions === 1) intervalDays = grade === "easy" ? 4 : 1;
    else if (repetitions === 2) intervalDays = grade === "hard" ? 3 : 6;
    else {
      const gradeMultiplier = grade === "hard" ? 0.8 : grade === "easy" ? 1.3 : 1;
      intervalDays = Math.max(1, previousInterval * ease * gradeMultiplier);
    }
  }

  intervalDays = Number(intervalDays.toFixed(3));
  const accuracy = correctCount / reviewCount;
  const retentionScore = Math.round(
    clamp(accuracy * 75 + Math.min(intervalDays, 30) / 30 * 25, 0, 100),
  );
  const status: VocabularyStatus =
    repetitions >= 5 && intervalDays >= 21 ? "mastered" : "learning";

  return {
    status,
    next_review_at: new Date(now.getTime() + intervalDays * DAY_MS).toISOString(),
    last_reviewed_at: now.toISOString(),
    review_interval: intervalDays,
    review_ease: Number(ease.toFixed(2)),
    review_count: reviewCount,
    correct_count: correctCount,
    review_repetitions: repetitions,
    review_lapses: lapses,
    retention_score: retentionScore,
  };
}