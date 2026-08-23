import type { LanguageCode } from "@/lib/languages";

import { getDueUnits, getStarterUnits, getWeaknessMap, lessonProgressKey } from "./progress";
import type {
  MinimalPairSet,
  PronunciationLanguagePack,
  PronunciationLesson,
  PronunciationUnit,
  ProgressByUnit,
  TrainingItem,
} from "./types";
import type { VocabularyPronunciationTarget } from "./words";

/* =========================================================
   Today's Training

   A short, fixed-shape session: a sound you keep missing, a listening
   contrast, a word from your own vocabulary, a rhythm rule, and one thing
   said out loud. The shape is the same every day; what fills it is not.

   Deterministic. Given the same progress and the same date this returns the
   same plan, so closing the app and coming back does not reshuffle what you
   were halfway through — and so the plan can be tested at all. Where a
   choice is genuinely arbitrary it is broken by the date rather than by
   Math.random, which is the difference between "varies day to day" and
   "varies every render".
   ========================================================= */

export type DailyTrainingPlan = {
  language: LanguageCode;
  /** Local calendar day this plan is for, as YYYY-MM-DD. */
  dateKey: string;
  items: TrainingItem[];
  totalSeconds: number;
};

export function dateKeyFor(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** A small, stable integer from a string. Used only to rotate choices. */
function hashOf(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function rotate<T>(items: T[], seed: number): T[] {
  if (items.length === 0) return items;
  const offset = seed % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

const SECONDS = {
  sound: 60,
  minimalPair: 60,
  word: 60,
  rhythm: 60,
  speak: 60,
} as const;

/**
 * The sounds worth spending today's two minutes on.
 *
 * Weakest first, then anything due, then — for someone who has just
 * started — the easiest units in the pack. Never random: a first session
 * that opens on tone sandhi is a first session that ends there.
 */
function chooseSounds(
  pack: PronunciationLanguagePack,
  progress: ProgressByUnit,
  now: Date,
  count: number,
): PronunciationUnit[] {
  const weak = getWeaknessMap(pack, progress)
    .filter((entry) => entry.band !== "strong")
    .map((entry) => entry.unit);

  const due = getDueUnits(pack, progress, now);
  const starters = getStarterUnits(pack, count * 2);

  const chosen: PronunciationUnit[] = [];
  const seen = new Set<string>();

  for (const unit of [...weak, ...due, ...rotate(starters, hashOf(dateKeyFor(now)))]) {
    if (seen.has(unit.id)) continue;
    seen.add(unit.id);
    chosen.push(unit);
    if (chosen.length >= count) break;
  }

  return chosen;
}

/**
 * A contrast that involves what is being practised, if one exists.
 *
 * Preferring a pair that contains today's weak sound is what makes the
 * listening step feel like part of the same lesson rather than a second
 * unrelated exercise.
 */
function choosePair(
  pack: PronunciationLanguagePack,
  focus: PronunciationUnit[],
  seed: number,
): MinimalPairSet | undefined {
  if (pack.minimalPairs.length === 0) return undefined;

  const focusIds = new Set(focus.map((unit) => unit.id));

  const relevant = pack.minimalPairs.filter((pair) =>
    pair.targets.some((target) => focusIds.has(target)),
  );

  const pool = relevant.length > 0 ? relevant : pack.minimalPairs;
  return rotate(pool, seed)[0];
}

/** The least-practised lesson, with the date breaking ties. */
function chooseLesson(
  pack: PronunciationLanguagePack,
  progress: ProgressByUnit,
  seed: number,
): PronunciationLesson | undefined {
  if (pack.lessons.length === 0) return undefined;

  const scored = rotate(pack.lessons, seed).map((lesson) => ({
    lesson,
    attempts: progress[lessonProgressKey(lesson.id)]?.attempts ?? 0,
  }));

  scored.sort((a, b) => a.attempts - b.attempts);
  return scored[0]?.lesson;
}

export type DailyTrainingInput = {
  pack: PronunciationLanguagePack;
  progress: ProgressByUnit;
  words: VocabularyPronunciationTarget[];
  now?: Date;
};

export function buildDailyTraining({
  pack,
  progress,
  words,
  now = new Date(),
}: DailyTrainingInput): DailyTrainingPlan {
  const dateKey = dateKeyFor(now);
  const seed = hashOf(`${pack.language}:${dateKey}`);

  const items: TrainingItem[] = [];

  const sounds = chooseSounds(pack, progress, now, 2);
  for (const unit of sounds) {
    items.push({
      id: `sound:${unit.id}`,
      kind: "sound",
      targetId: unit.id,
      module: "sounds",
      label: unit.symbol,
      estimatedSeconds: SECONDS.sound,
    });
  }

  const pair = choosePair(pack, sounds, seed);
  if (pair) {
    items.push({
      id: `pair:${pair.id}`,
      kind: "minimal-pair",
      targetId: pair.id,
      module: "listen",
      label: pair.targets.join(" / "),
      estimatedSeconds: SECONDS.minimalPair,
    });
  }

  /*
   * One word, and only one.
   *
   * Words are the part of the plan that can be empty — a learner who has
   * saved nothing in this language yet has no words to practise, and the
   * plan is shorter rather than padded with something invented.
   */
  const word = rotate(words, seed)[0];
  if (word) {
    items.push({
      id: `word:${word.itemId}`,
      kind: "word",
      targetId: word.itemId,
      module: "words",
      label: word.text,
      estimatedSeconds: SECONDS.word,
    });
  }

  const lesson = chooseLesson(pack, progress, seed);
  if (lesson) {
    items.push({
      id: `rhythm:${lesson.id}`,
      kind: "rhythm",
      targetId: lesson.id,
      module: "rhythm",
      label: lesson.id,
      estimatedSeconds: SECONDS.rhythm,
    });
  }

  // Ends on saying something, which is the point of the whole session.
  const speakTarget = sounds[0];
  if (speakTarget) {
    items.push({
      id: `speak:${speakTarget.id}`,
      kind: "speak",
      targetId: speakTarget.id,
      module: "speak",
      label: speakTarget.symbol,
      estimatedSeconds: SECONDS.speak,
    });
  }

  return {
    language: pack.language,
    dateKey,
    items,
    totalSeconds: items.reduce((sum, item) => sum + item.estimatedSeconds, 0),
  };
}
