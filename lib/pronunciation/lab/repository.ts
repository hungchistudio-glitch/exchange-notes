import type { SupabaseClient } from "@supabase/supabase-js";

import type { LanguageCode } from "@/lib/languages";

import { applyAttempt, emptyProgress } from "./progress";
import { summariseSession } from "./session";
import type {
  PronunciationMastery,
  PronunciationProgress,
  PronunciationTrainingSession,
  ProgressByUnit,
  PronunciationModuleId,
  TrainingItemOutcome,
} from "./types";

/* =========================================================
   Storage

   Reads and writes the three pronunciation_* tables and nothing else. The
   calculations all live in progress.ts; this only moves rows.

   Everything returns a result rather than throwing. The Lab is usable
   signed out and offline — the sounds, the audio and the articulation are
   all local — so a storage failure means "your progress will not be saved",
   which is a message, not a broken screen.
   ========================================================= */

const PROGRESS_TABLE = "pronunciation_progress";
const ATTEMPTS_TABLE = "pronunciation_attempts";
const SESSIONS_TABLE = "pronunciation_sessions";

export type StorageFailure = "unauthenticated" | "unavailable";

export type ProgressLoad =
  | { ok: true; progress: ProgressByUnit }
  | { ok: false; reason: StorageFailure };

type ProgressRow = {
  unit_id: string;
  listening_score: number | null;
  speaking_score: number | null;
  accuracy_score: number | null;
  attempts: number;
  correct_attempts: number;
  mastery: string;
  last_practiced_at: string | null;
};

const MASTERY_VALUES: readonly string[] = [
  "new",
  "learning",
  "improving",
  "mastered",
];

function readMastery(value: string): PronunciationMastery {
  return MASTERY_VALUES.includes(value)
    ? (value as PronunciationMastery)
    : "new";
}

function toProgress(row: ProgressRow, language: LanguageCode): PronunciationProgress {
  return {
    language,
    unitId: row.unit_id,
    listeningScore: row.listening_score ?? undefined,
    speakingScore: row.speaking_score ?? undefined,
    accuracyScore: row.accuracy_score ?? undefined,
    attempts: row.attempts,
    correctAttempts: row.correct_attempts,
    mastery: readMastery(row.mastery),
    lastPracticedAt: row.last_practiced_at ?? undefined,
  };
}

/**
 * One language's progress, keyed by unit.
 *
 * Scoped to the language in the query rather than filtered afterwards, so
 * switching what you are learning cannot leave the previous language's rows
 * in memory to be read by the new pack.
 */
export async function fetchPronunciationProgress(
  supabase: SupabaseClient,
  language: LanguageCode,
): Promise<ProgressLoad> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, reason: "unauthenticated" };

  const { data, error } = await supabase
    .from(PROGRESS_TABLE)
    .select(
      "unit_id, listening_score, speaking_score, accuracy_score, attempts, correct_attempts, mastery, last_practiced_at",
    )
    .eq("user_id", user.id)
    .eq("language", language);

  if (error) {
    console.error("Could not load pronunciation progress:", error);
    return { ok: false, reason: "unavailable" };
  }

  const progress: ProgressByUnit = {};
  for (const row of (data ?? []) as ProgressRow[]) {
    progress[row.unit_id] = toProgress(row, language);
  }

  return { ok: true, progress };
}

export type AttemptRecord = {
  language: LanguageCode;
  unitId: string;
  module: PronunciationModuleId;
  outcome: TrainingItemOutcome;
  /** Absent when nothing measured this attempt. Never substituted. */
  score?: number;
  /** Which analyzer produced `score`, when one did. */
  analyzer?: string;
  listeningScore?: number;
  speakingScore?: number;
  accuracyScore?: number;
};

export type AttemptSaveResult =
  | { ok: true; progress: PronunciationProgress }
  | { ok: false; reason: StorageFailure; progress: PronunciationProgress };

/**
 * Records one attempt and folds it into the unit's progress.
 *
 * The local progress row is computed either way and returned, so the screen
 * updates immediately and stays correct even when the write fails — an
 * offline session still shows you getting better, it just does not remember
 * it tomorrow.
 *
 * Read-then-write rather than an atomic increment: there is no row-level
 * contention to lose here (one person, one device, one attempt at a time),
 * and doing the fold in TypeScript keeps a single definition of mastery
 * instead of a second one written in SQL.
 */
export async function recordPronunciationAttempt(
  supabase: SupabaseClient,
  attempt: AttemptRecord,
  known?: PronunciationProgress,
): Promise<AttemptSaveResult> {
  const base = known ?? emptyProgress(attempt.language, attempt.unitId);

  const next = applyAttempt(base, {
    correct: attempt.outcome === "correct",
    listeningScore: attempt.listeningScore,
    speakingScore: attempt.speakingScore,
    accuracyScore: attempt.accuracyScore,
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, reason: "unauthenticated", progress: next };

  const now = new Date().toISOString();

  const [{ error: attemptError }, { error: progressError }] = await Promise.all([
    supabase.from(ATTEMPTS_TABLE).insert({
      user_id: user.id,
      language: attempt.language,
      unit_id: attempt.unitId,
      module: attempt.module,
      outcome: attempt.outcome,
      score: attempt.score ?? null,
      analyzer: attempt.analyzer ?? null,
    }),
    supabase.from(PROGRESS_TABLE).upsert(
      {
        user_id: user.id,
        language: attempt.language,
        unit_id: attempt.unitId,
        listening_score: next.listeningScore ?? null,
        speaking_score: next.speakingScore ?? null,
        accuracy_score: next.accuracyScore ?? null,
        attempts: next.attempts,
        correct_attempts: next.correctAttempts,
        mastery: next.mastery,
        last_practiced_at: next.lastPracticedAt ?? now,
        updated_at: now,
      },
      { onConflict: "user_id,language,unit_id" },
    ),
  ]);

  if (attemptError || progressError) {
    console.error(
      "Could not save pronunciation attempt:",
      attemptError ?? progressError,
    );
    return { ok: false, reason: "unavailable", progress: next };
  }

  return { ok: true, progress: next };
}

/**
 * Files a finished session.
 *
 * Best-effort and deliberately last: the attempts inside it are already
 * saved individually, so this row is a convenience for looking back at
 * sessions, not the record of what happened.
 */
export async function saveTrainingSession(
  supabase: SupabaseClient,
  session: PronunciationTrainingSession,
): Promise<{ ok: boolean }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { ok: false };

    const summary = summariseSession(session);

    const { error } = await supabase.from(SESSIONS_TABLE).insert({
      user_id: user.id,
      language: session.language,
      item_count: summary.total,
      answered_count: summary.answered,
      correct_count: summary.correct,
      average_score: summary.averageScore,
      started_at: session.startedAt,
      completed_at: session.completedAt ?? new Date().toISOString(),
    });

    if (error) {
      console.error("Could not save pronunciation session:", error);
      return { ok: false };
    }

    return { ok: true };
  } catch (error) {
    console.error("Could not save pronunciation session:", error);
    return { ok: false };
  }
}
