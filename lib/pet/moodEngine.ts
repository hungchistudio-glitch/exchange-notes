import { getPronunciationData } from "@/lib/pronunciation";
import type { VocabularyItem } from "@/lib/types/app";

import type { Cookie, CookieType, YumiMood } from "./types";

const COOKIE_CYCLE: CookieType[] = ["letter", "zhuyin"];
const ZHUYIN_SYMBOL_PATTERN = /[ㄅ-ㄯ]/;

// Vocabulary items don't carry a "was this English or Zhuyin content"
// distinction (each row is one English+Chinese pair), so cookie shape is
// assigned by earned order for visual variety: letter → zhuyin, repeating.
export function cookieTypeForIndex(index: number): CookieType {
  return COOKIE_CYCLE[index % COOKIE_CYCLE.length];
}

// The cookie's actual glyph — the real first letter of the learned English
// word, or the real first Zhuyin symbol from its Chinese reading (computed
// locally via pinyin-pro/pinyin-to-zhuyin, no network/Gemini call) — so
// each cookie represents a genuine piece of that word, not a random shape.
function glyphForCookie(item: VocabularyItem, type: CookieType): string {
  if (type === "letter") {
    const letter = item.word.trim().charAt(0).toUpperCase();
    return letter || "?";
  }

  const { zhuyin } = getPronunciationData({ chinese: item.translation });
  const firstToken = zhuyin?.trim().split(/\s+/)[0] ?? "";
  const symbol = [...firstToken].find((char) => ZHUYIN_SYMBOL_PATTERN.test(char));

  return symbol ?? "ㄅ";
}

export type GrowthStage = 0 | 1 | 2 | 3;

export function computeGrowthStage(totalCookiesFed: number): GrowthStage {
  if (totalCookiesFed >= 60) return 3;
  if (totalCookiesFed >= 25) return 2;
  if (totalCookiesFed >= 8) return 1;
  return 0;
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  next.setDate(next.getDate() + amount);
  return next;
}

export type WordStreak = {
  currentStreak: number;
  longestStreak: number;
  addedToday: boolean;
};

// Mirrors lib/review/getLearningStreak.ts's date-key algorithm, but counts
// days a vocabulary word was *added* rather than reviewed — the natural
// streak definition for a "feed Yumi a new word" mechanic. Operates on
// already-loaded items, so it costs no extra Supabase round trip.
export function computeWordStreak(items: VocabularyItem[]): WordStreak {
  const activeDateKeys = new Set(
    items.map((item) => toLocalDateKey(new Date(item.created_at))),
  );

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const todayKey = toLocalDateKey(today);
  const yesterdayKey = toLocalDateKey(addDays(today, -1));
  const addedToday = activeDateKeys.has(todayKey);

  let currentStreak = 0;

  if (addedToday || activeDateKeys.has(yesterdayKey)) {
    let cursor = addedToday ? today : addDays(today, -1);

    while (activeDateKeys.has(toLocalDateKey(cursor))) {
      currentStreak += 1;
      cursor = addDays(cursor, -1);
    }
  }

  const sortedDateKeys = [...activeDateKeys].sort();

  let longestStreak = 0;
  let runningStreak = 0;
  let previousDate: Date | null = null;

  for (const dateKey of sortedDateKeys) {
    const currentDate = new Date(`${dateKey}T12:00:00`);

    if (
      previousDate &&
      toLocalDateKey(addDays(previousDate, 1)) === dateKey
    ) {
      runningStreak += 1;
    } else {
      runningStreak = 1;
    }

    longestStreak = Math.max(longestStreak, runningStreak);
    previousDate = currentDate;
  }

  return { currentStreak, longestStreak, addedToday };
}

export function wordsAddedToday(items: VocabularyItem[]): number {
  const todayKey = toLocalDateKey(new Date());

  return items.filter(
    (item) => toLocalDateKey(new Date(item.created_at)) === todayKey,
  ).length;
}

export function daysSince(dateIso: string | null): number {
  if (!dateIso) return Infinity;

  const then = new Date(dateIso).getTime();
  const now = Date.now();

  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

export function hasCrown(streakDays: number): boolean {
  return streakDays >= 7;
}

export type MoodInputs = {
  wordsToday: number;
  streakDays: number;
  cookiesAvailable: number;
  daysSinceLastOpen: number;
  goalCompleted: boolean;
};

export function computeMood({
  wordsToday,
  streakDays,
  cookiesAvailable,
  daysSinceLastOpen,
  goalCompleted,
}: MoodInputs): YumiMood {
  if (daysSinceLastOpen >= 3) return "missingYou";
  if (goalCompleted || streakDays >= 7) return "proud";
  if (cookiesAvailable >= 5) return "excited";
  if (wordsToday > 0) return "happy";
  if (cookiesAvailable > 0) return "curious";
  return "hungry";
}

// The brief-and-satisfying reaction Yumi plays right after eating a
// specific cookie type, independent of the steady-state mood above.
export function cookieReactionMood(type: CookieType): YumiMood {
  switch (type) {
    case "letter":
      return "curious";
    case "zhuyin":
      return "happy";
  }
}

// Builds the full earned-order cookie list (oldest word first) so a
// cookie's shape/type stays stable regardless of feed order, then filters
// down to the ones not yet fed to Yumi.
export function buildAvailableCookies(
  items: VocabularyItem[],
  fedWordIds: string[],
): Cookie[] {
  const fedSet = new Set(fedWordIds);
  const sorted = [...items].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return sorted
    .map((item, index) => {
      const type = cookieTypeForIndex(index);

      return {
        id: item.id,
        word: item.word,
        type,
        glyph: glyphForCookie(item, type),
      };
    })
    .filter((cookie) => !fedSet.has(cookie.id));
}
