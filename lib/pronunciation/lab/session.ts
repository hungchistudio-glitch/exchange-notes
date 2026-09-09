import { isLanguageCode, type LanguageCode } from "@/lib/languages";

import type {
  PronunciationTrainingSession,
  TrainingItem,
  TrainingItemOutcome,
  TrainingItemResult,
} from "./types";

/* =========================================================
   A training session

   A reducer plus a serialiser, and nothing else. No timers, no fetches, no
   audio — a session is a position in a list and a record of what happened
   at each position, and keeping it that way is what lets it survive a
   refresh, a route change and a language switch.
   ========================================================= */

export type SessionAction =
  | { type: "answer"; outcome: TrainingItemOutcome; score?: number }
  | { type: "retry" }
  | { type: "skip" }
  | { type: "back" }
  | { type: "complete"; at?: string };

export function startSession(
  language: LanguageCode,
  items: TrainingItem[],
  options: { id?: string; startedAt?: string } = {},
): PronunciationTrainingSession {
  return {
    id: options.id ?? `${language}-${Date.now()}`,
    language,
    items,
    index: 0,
    results: [],
    startedAt: options.startedAt ?? new Date().toISOString(),
  };
}

export function currentItem(
  session: PronunciationTrainingSession,
): TrainingItem | undefined {
  return session.items[session.index];
}

export function isComplete(session: PronunciationTrainingSession): boolean {
  return session.index >= session.items.length;
}

function recordResult(
  results: TrainingItemResult[],
  itemId: string,
  outcome: TrainingItemOutcome,
  score: number | undefined,
): TrainingItemResult[] {
  const existing = results.find((result) => result.itemId === itemId);

  if (!existing) {
    return [...results, { itemId, outcome, score, attempts: 1 }];
  }

  /*
   * A retried item keeps its attempt count and takes the newer outcome, but
   * only takes a newer *score* if there is one. An analyzer that could not
   * measure the second attempt has not erased the first measurement.
   */
  return results.map((result) =>
    result.itemId === itemId
      ? {
          itemId,
          outcome,
          score: score ?? result.score,
          attempts: result.attempts + 1,
        }
      : result,
  );
}

export function sessionReducer(
  session: PronunciationTrainingSession,
  action: SessionAction,
): PronunciationTrainingSession {
  switch (action.type) {
    case "answer": {
      const item = currentItem(session);
      if (!item) return session;

      return {
        ...session,
        results: recordResult(
          session.results,
          item.id,
          action.outcome,
          action.score,
        ),
        index: session.index + 1,
      };
    }

    case "retry": {
      // Stays on the item. The attempt is only counted when it is answered,
      // so tapping retry three times before speaking does not read as three
      // failures.
      return session;
    }

    case "skip": {
      const item = currentItem(session);
      if (!item) return session;

      return {
        ...session,
        results: recordResult(session.results, item.id, "skipped", undefined),
        index: session.index + 1,
      };
    }

    case "back": {
      return { ...session, index: Math.max(0, session.index - 1) };
    }

    case "complete": {
      return {
        ...session,
        index: session.items.length,
        completedAt: action.at ?? new Date().toISOString(),
      };
    }
  }
}

/* =========================================================
   Summary
   ========================================================= */

export type SessionSummary = {
  total: number;
  answered: number;
  correct: number;
  almost: number;
  incorrect: number;
  skipped: number;
  /** null when nothing in the session was measured. */
  averageScore: number | null;
};

export function summariseSession(
  session: PronunciationTrainingSession,
): SessionSummary {
  const scores = session.results
    .map((result) => result.score)
    .filter((score): score is number => typeof score === "number");

  return {
    total: session.items.length,
    answered: session.results.filter((result) => result.outcome !== "skipped")
      .length,
    correct: session.results.filter((result) => result.outcome === "correct")
      .length,
    almost: session.results.filter((result) => result.outcome === "almost")
      .length,
    incorrect: session.results.filter((result) => result.outcome === "incorrect")
      .length,
    skipped: session.results.filter((result) => result.outcome === "skipped")
      .length,
    averageScore:
      scores.length === 0
        ? null
        : Math.round(
            scores.reduce((sum, score) => sum + score, 0) / scores.length,
          ),
  };
}

/* =========================================================
   Surviving a refresh
   ========================================================= */

const STORAGE_KEY = "exchange-notes-pronunciation-session";

/**
 * Reads a stored session back, or null.
 *
 * Validated rather than cast. This comes out of sessionStorage, which any
 * script on the origin can write and which survives a deploy that changed
 * the shape — trusting it would mean a malformed value crashing the screen
 * it was supposed to restore.
 */
export function parseStoredSession(
  raw: string | null,
): PronunciationTrainingSession | null {
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<PronunciationTrainingSession>;

    if (
      typeof value !== "object" ||
      value === null ||
      typeof value.id !== "string" ||
      !isLanguageCode(value.language) ||
      !Array.isArray(value.items) ||
      typeof value.index !== "number" ||
      !Array.isArray(value.results) ||
      typeof value.startedAt !== "string"
    ) {
      return null;
    }

    const items = value.items.filter(
      (item): item is TrainingItem =>
        typeof item?.id === "string" &&
        typeof item?.targetId === "string" &&
        typeof item?.label === "string",
    );

    if (items.length !== value.items.length) return null;

    return {
      id: value.id,
      language: value.language,
      items,
      index: Math.min(Math.max(0, value.index), items.length),
      results: value.results.filter(
        (result): result is TrainingItemResult =>
          typeof result?.itemId === "string" &&
          typeof result?.attempts === "number",
      ),
      startedAt: value.startedAt,
      completedAt:
        typeof value.completedAt === "string" ? value.completedAt : undefined,
    };
  } catch {
    return null;
  }
}

export function loadSession(
  language: LanguageCode,
): PronunciationTrainingSession | null {
  if (typeof window === "undefined") return null;

  const session = parseStoredSession(
    window.sessionStorage.getItem(STORAGE_KEY),
  );

  /*
   * A session belonging to another language is discarded rather than
   * resumed. Switching what you are learning mid-session and being handed
   * Spanish items on a French screen is exactly the state leakage this
   * whole refactor exists to prevent.
   */
  if (!session || session.language !== language) return null;
  if (session.completedAt) return null;

  return session;
}

export function saveSession(session: PronunciationTrainingSession): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Private mode, or a full quota. Losing the ability to resume is not
    // worth failing the session over.
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // See above.
  }
}
