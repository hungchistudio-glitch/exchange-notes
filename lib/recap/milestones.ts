/* =========================================================
   Milestones worth sharing (Chi, 2026-11-15: 達成里程碑時在複習頁提醒)

   A library reaching a round number of words, or a run of days reaching
   a week, a month, a hundred days, a year. Each is offered once: the
   review page shows it until the reader opens or dismisses it, and the
   recap card then carries it as its headline.
   ========================================================= */

export type Milestone = { id: string; kind: "words" | "streak"; value: number };

export const WORD_MARKS = [10, 50, 100, 250, 500, 1000, 2000, 5000] as const;
export const STREAK_MARKS = [7, 30, 100, 365] as const;

const SEEN_KEY = "exchange-notes:milestones-seen";

export function milestoneId(kind: Milestone["kind"], value: number) {
  return `${kind}-${value}`;
}

export function parseMilestone(id: string | null | undefined): Milestone | null {
  const match = /^(words|streak)-(\d+)$/.exec(id ?? "");
  if (!match) return null;
  const kind = match[1] as Milestone["kind"];
  const value = Number(match[2]);
  const marks: readonly number[] = kind === "words" ? WORD_MARKS : STREAK_MARKS;
  return marks.includes(value) ? { id: milestoneId(kind, value), kind, value } : null;
}

export function seenMilestones(): Set<string> {
  try {
    const stored = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "[]");
    return new Set(Array.isArray(stored) ? stored.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

export function markMilestoneSeen(id: string) {
  try {
    const seen = seenMilestones();
    seen.add(id);
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    /* Private mode: it may be offered again next visit. */
  }
}

/**
 * The milestone to offer now: the highest one reached in each kind, the run
 * of days first, if the reader has not been shown it.
 */
export function milestoneToOffer(
  { totalWords, streak }: { totalWords: number; streak: number },
  seen: ReadonlySet<string>,
): Milestone | null {
  const highest = (marks: readonly number[], value: number) => [...marks].reverse().find((mark) => value >= mark);
  const streakMark = highest(STREAK_MARKS, streak);
  if (streakMark && !seen.has(milestoneId("streak", streakMark))) {
    return { id: milestoneId("streak", streakMark), kind: "streak", value: streakMark };
  }
  const wordMark = highest(WORD_MARKS, totalWords);
  if (wordMark && !seen.has(milestoneId("words", wordMark))) {
    return { id: milestoneId("words", wordMark), kind: "words", value: wordMark };
  }
  return null;
}
