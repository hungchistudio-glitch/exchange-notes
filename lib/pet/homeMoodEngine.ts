import type { VocabularyItem } from "@/lib/types/app";

import { cookieTypeForIndex } from "./moodEngine";
import type { CookieType } from "./types";

// A richer, Home-page-specific mood set than the Vocabulary page's
// MurphMood — driven day-by-day by how many words were added today, and
// (when none have been added yet today) by how many days it's been since
// the last one. Kept separate from lib/pet/moodEngine.ts on purpose: same
// character, different "scene" with different pacing/thresholds.
export type HomeMood =
  | "waiting"
  | "curious"
  | "happy"
  | "dancing"
  | "excited"
  | "hungry"
  | "sad"
  | "grumpy"
  | "lonely"
  | "sleeping"
  | "welcomeBack";

export type HomeReactionMood = "curious" | "happy";

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function daysBetweenKeys(fromKey: string, toKey: string) {
  const from = new Date(`${fromKey}T12:00:00`);
  const to = new Date(`${toKey}T12:00:00`);

  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export type HomeContext = {
  wordsToday: number;
  daysSinceLastWord: number;
  justReturned: boolean;
};

// Reads the same vocabulary_items already loaded by the Home page (no
// extra query) to figure out today's count and the gap since the last
// active day before today.
export function computeHomeContext(items: VocabularyItem[]): HomeContext {
  const todayKey = toLocalDateKey(new Date());
  const dateKeys = items.map((item) => toLocalDateKey(new Date(item.created_at)));

  const wordsToday = dateKeys.filter((key) => key === todayKey).length;

  const priorKeys = [...new Set(dateKeys)].filter((key) => key < todayKey).sort();
  const lastPriorKey = priorKeys[priorKeys.length - 1] ?? null;

  let daysSinceLastWord = 0;
  if (wordsToday === 0 && lastPriorKey) {
    daysSinceLastWord = daysBetweenKeys(lastPriorKey, todayKey);
  }

  let justReturned = false;
  if (wordsToday > 0 && lastPriorKey) {
    justReturned = daysBetweenKeys(lastPriorKey, todayKey) >= 2;
  }

  return { wordsToday, daysSinceLastWord, justReturned };
}

// The steady-state mood for "today", independent of one-shot intros
// (dancing / welcome-back / lonely-tear) which the component layers on
// top and clears after they finish playing.
export function computeSteadyHomeMood({
  wordsToday,
  daysSinceLastWord,
}: HomeContext): HomeMood {
  if (wordsToday >= 4) return "excited";
  if (wordsToday >= 2) return "happy";
  if (wordsToday === 1) return "curious";

  if (daysSinceLastWord <= 0) return "waiting";
  if (daysSinceLastWord === 1) return "hungry";
  if (daysSinceLastWord === 2) return "sad";
  if (daysSinceLastWord === 3) return "grumpy";
  if (daysSinceLastWord === 4) return "lonely";
  return "sleeping";
}

export function cookieHomeReaction(type: CookieType): HomeReactionMood {
  switch (type) {
    case "letter":
      return "curious";
    case "zhuyin":
      return "happy";
  }
}

export { cookieTypeForIndex };
