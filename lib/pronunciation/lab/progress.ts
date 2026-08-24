import type { LanguageCode } from "@/lib/languages";

import { groupsForModule, unitsInGroup } from "./registry";
import type {
  PronunciationLanguagePack,
  PronunciationMastery,
  PronunciationProgress,
  PronunciationUnit,
  ProgressByUnit,
} from "./types";

/* =========================================================
   Progress, in one place

   Every percentage the Lab shows is computed here. Components read the
   result; none of them divides anything. That is not tidiness for its own
   sake — the app had four different definitions of "mastered" before, and
   two screens disagreeing about a number is worse than either being wrong.

   The rule this file exists to hold: a number that nothing measured is
   `null`, never zero. "0% mastered" and "you have not practised this yet"
   look the same in a progress bar and mean entirely different things.
   ========================================================= */

/**
 * Progress rows are keyed by unit id, and lessons and minimal pairs are not
 * units. These namespace them into the same space without collisions.
 */
export function lessonProgressKey(lessonId: string): string {
  return `lesson:${lessonId}`;
}
/* =========================================================
   Mastery
   ========================================================= */

const MASTERED_MIN_ATTEMPTS = 5;
const MASTERED_MIN_ACCURACY = 0.8;
const LEARNING_MAX_ATTEMPTS = 3;
const IMPROVING_MIN_ACCURACY = 0.5;

export type MasteryInput = {
  attempts: number;
  correctAttempts: number;
};

/**
 * Where a unit stands, from its own history.
 *
 * Deliberately not derived from the most recent score: one good attempt at
 * a sound you have failed nine times is not mastery, and one bad attempt at
 * a sound you have had right for a month is a bad day. Accuracy over the
 * whole history is the honest summary, and attempt count is what stops a
 * single lucky answer from reading as either.
 */
export function deriveMastery({
  attempts,
  correctAttempts,
}: MasteryInput): PronunciationMastery {
  if (attempts <= 0) return "new";

  const accuracy = correctAttempts / attempts;

  if (attempts < LEARNING_MAX_ATTEMPTS || accuracy < IMPROVING_MIN_ACCURACY) {
    return "learning";
  }
  if (attempts >= MASTERED_MIN_ATTEMPTS && accuracy >= MASTERED_MIN_ACCURACY) {
    return "mastered";
  }
  return "improving";
}

export function accuracyOf(progress: PronunciationProgress): number | null {
  if (progress.attempts <= 0) return null;
  return progress.correctAttempts / progress.attempts;
}

/** A blank row, for a unit the learner has never touched. */
export function emptyProgress(
  language: LanguageCode,
  unitId: string,
): PronunciationProgress {
  return {
    language,
    unitId,
    attempts: 0,
    correctAttempts: 0,
    mastery: "new",
  };
}

/**
 * Folds one attempt into a progress row.
 *
 * Scores are averaged rather than replaced so that a single attempt cannot
 * swing a unit's number across the whole scale, and an absent score leaves
 * the previous one alone instead of erasing it — an analyzer that could not
 * measure stress has not learned that your stress got worse.
 */
export function applyAttempt(
  current: PronunciationProgress,
  attempt: {
    correct: boolean;
    listeningScore?: number;
    speakingScore?: number;
    accuracyScore?: number;
    at?: string;
  },
): PronunciationProgress {
  const attempts = current.attempts + 1;
  const correctAttempts = current.correctAttempts + (attempt.correct ? 1 : 0);

  const blend = (previous: number | undefined, next: number | undefined) => {
    if (next === undefined) return previous;
    if (previous === undefined) return Math.round(next);
    return Math.round(previous * 0.7 + next * 0.3);
  };

  return {
    ...current,
    attempts,
    correctAttempts,
    listeningScore: blend(current.listeningScore, attempt.listeningScore),
    speakingScore: blend(current.speakingScore, attempt.speakingScore),
    accuracyScore: blend(current.accuracyScore, attempt.accuracyScore),
    mastery: deriveMastery({ attempts, correctAttempts }),
    lastPracticedAt: attempt.at ?? new Date().toISOString(),
  };
}

/* =========================================================
   Summaries
   ========================================================= */

export type LanguageProgressSummary = {
  totalUnits: number;
  practisedUnits: number;
  counts: Record<PronunciationMastery, number>;
  /** null until at least one unit has been practised. */
  masteredPercent: number | null;
  listening: number | null;
  speaking: number | null;
  accuracy: number | null;
};

function averageOf(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function getLanguagePronunciationProgress(
  pack: PronunciationLanguagePack,
  progress: ProgressByUnit,
): LanguageProgressSummary {
  const counts: Record<PronunciationMastery, number> = {
    new: 0,
    learning: 0,
    improving: 0,
    mastered: 0,
  };

  const listening: number[] = [];
  const speaking: number[] = [];
  const accuracy: number[] = [];
  let practisedUnits = 0;

  for (const unit of pack.units) {
    const row = progress[unit.id];
    const mastery = row?.mastery ?? "new";
    counts[mastery] += 1;

    if (row && row.attempts > 0) {
      practisedUnits += 1;
      if (row.listeningScore !== undefined) listening.push(row.listeningScore);
      if (row.speakingScore !== undefined) speaking.push(row.speakingScore);
      if (row.accuracyScore !== undefined) accuracy.push(row.accuracyScore);
    }
  }

  return {
    totalUnits: pack.units.length,
    practisedUnits,
    counts,
    masteredPercent:
      practisedUnits === 0
        ? null
        : Math.round((counts.mastered / pack.units.length) * 100),
    listening: averageOf(listening),
    speaking: averageOf(speaking),
    accuracy: averageOf(accuracy),
  };
}

export type CategoryMastery = {
  groupId: string;
  total: number;
  practised: number;
  mastered: number;
  /** null until something in this group has been practised. */
  percent: number | null;
};

export function getCategoryMastery(
  pack: PronunciationLanguagePack,
  groupId: string,
  progress: ProgressByUnit,
): CategoryMastery {
  const units = unitsInGroup(pack, groupId);

  let practised = 0;
  let mastered = 0;

  for (const unit of units) {
    const row = progress[unit.id];
    if (row && row.attempts > 0) practised += 1;
    if (row?.mastery === "mastered") mastered += 1;
  }

  return {
    groupId,
    total: units.length,
    practised,
    mastered,
    percent: practised === 0 || units.length === 0
      ? null
      : Math.round((mastered / units.length) * 100),
  };
}

/**
 * The rhythm side of the progress header.
 *
 * Rhythm progress lives on lessons, not units, so it cannot be read out of
 * the same loop as the sounds — this is its own count rather than a filter
 * over the one above.
 */
export function getRhythmProgress(
  pack: PronunciationLanguagePack,
  progress: ProgressByUnit,
): { total: number; practised: number; percent: number | null } {
  const total = pack.lessons.length;

  const practised = pack.lessons.filter((lesson) => {
    const row = progress[lessonProgressKey(lesson.id)];
    return row !== undefined && row.attempts > 0;
  }).length;

  return {
    total,
    practised,
    percent: practised === 0 || total === 0
      ? null
      : Math.round((practised / total) * 100),
  };
}

/* =========================================================
   Review scheduling

   Not SM-2. lib/review/sm2.ts schedules a vocabulary row and needs the ease
   and repetition columns that live on it; a pronunciation unit has neither,
   and giving it a parallel set purely to reuse the function would be more
   machinery than the problem has. What a sound needs is simpler: the better
   you know it, the longer until it comes back.
   ========================================================= */

const DAY_MS = 86_400_000;

const REVIEW_INTERVAL_DAYS: Record<PronunciationMastery, number> = {
  new: 0,
  learning: 1,
  improving: 3,
  mastered: 10,
};

export function isDue(
  progress: PronunciationProgress | undefined,
  now: Date = new Date(),
): boolean {
  if (!progress || progress.attempts === 0) return false;
  if (!progress.lastPracticedAt) return true;

  const last = new Date(progress.lastPracticedAt).getTime();
  if (Number.isNaN(last)) return true;

  const interval = REVIEW_INTERVAL_DAYS[progress.mastery] * DAY_MS;
  return now.getTime() - last >= interval;
}

/** Units whose interval has elapsed, weakest first. */
export function getDueUnits(
  pack: PronunciationLanguagePack,
  progress: ProgressByUnit,
  now: Date = new Date(),
): PronunciationUnit[] {
  return pack.units
    .filter((unit) => isDue(progress[unit.id], now))
    .sort((a, b) => {
      const aAccuracy = accuracyOf(progress[a.id]!) ?? 1;
      const bAccuracy = accuracyOf(progress[b.id]!) ?? 1;
      return aAccuracy - bAccuracy;
    });
}

/* =========================================================
   Weakness
   ========================================================= */

export type WeaknessBand = "needsWork" | "improving" | "strong";

export type WeaknessEntry = {
  unit: PronunciationUnit;
  band: WeaknessBand;
  accuracy: number;
  attempts: number;
};

const NEEDS_WORK_BELOW = 0.6;
const STRONG_AT_OR_ABOVE = 0.85;

/**
 * How a unit is doing, from its whole history rather than its last attempt.
 *
 * Units with fewer than two attempts are left out entirely: one answer is
 * not evidence, and a map that calls a sound weak because you missed it once
 * on first sight teaches the learner to distrust the map.
 */
export function getWeaknessMap(
  pack: PronunciationLanguagePack,
  progress: ProgressByUnit,
): WeaknessEntry[] {
  const entries: WeaknessEntry[] = [];

  for (const unit of pack.units) {
    const row = progress[unit.id];
    if (!row || row.attempts < 2) continue;

    const accuracy = row.correctAttempts / row.attempts;
    const band: WeaknessBand =
      accuracy < NEEDS_WORK_BELOW
        ? "needsWork"
        : accuracy < STRONG_AT_OR_ABOVE
          ? "improving"
          : "strong";

    entries.push({ unit, band, accuracy, attempts: row.attempts });
  }

  return entries.sort((a, b) => a.accuracy - b.accuracy);
}

export function getWeakUnits(
  pack: PronunciationLanguagePack,
  progress: ProgressByUnit,
  limit = 6,
): PronunciationUnit[] {
  return getWeaknessMap(pack, progress)
    .filter((entry) => entry.band !== "strong")
    .slice(0, limit)
    .map((entry) => entry.unit);
}

/** Groups a weakness map into the three bands, each already sorted. */
export function groupWeaknessByBand(
  entries: WeaknessEntry[],
): Record<WeaknessBand, WeaknessEntry[]> {
  return {
    needsWork: entries.filter((entry) => entry.band === "needsWork"),
    improving: entries.filter((entry) => entry.band === "improving"),
    strong: entries.filter((entry) => entry.band === "strong"),
  };
}

/**
 * Units to start with when there is no history to go on.
 *
 * Easiest first, and only from the Sounds groups — a first session should
 * not open on a tone sandhi rule.
 */
export function getStarterUnits(
  pack: PronunciationLanguagePack,
  limit = 6,
): PronunciationUnit[] {
  const soundGroupIds = new Set(
    groupsForModule(pack, "sounds").map((group) => group.id),
  );

  return pack.units
    .filter((unit) => soundGroupIds.has(unit.group))
    .slice()
    .sort((a, b) => a.difficulty - b.difficulty)
    .slice(0, limit);
}
