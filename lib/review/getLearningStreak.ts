import { createClient } from "@/lib/supabase/client";

export type StreakDay = {
  date: string;
  active: boolean;
};

export type LearningStreak = {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  reviewedToday: boolean;
  week: StreakDay[];
};

const EMPTY_STREAK: LearningStreak = {
  currentStreak: 0,
  longestStreak: 0,
  totalActiveDays: 0,
  reviewedToday: false,
  week: [],
};

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

export async function getLearningStreak(): Promise<LearningStreak> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    return EMPTY_STREAK;
  }

  const { data, error } = await supabase
    .from("review_events")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const activeDateKeys = new Set(
    (data ?? []).map((event) =>
      toLocalDateKey(new Date(event.created_at)),
    ),
  );

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const todayKey = toLocalDateKey(today);
  const yesterdayKey = toLocalDateKey(addDays(today, -1));
  const reviewedToday = activeDateKeys.has(todayKey);

  let currentStreak = 0;

  if (reviewedToday || activeDateKeys.has(yesterdayKey)) {
    let cursor = reviewedToday ? today : addDays(today, -1);

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

  const week = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index - 6);
    const dateKey = toLocalDateKey(date);

    return {
      date: dateKey,
      active: activeDateKeys.has(dateKey),
    };
  });

  return {
    currentStreak,
    longestStreak,
    totalActiveDays: activeDateKeys.size,
    reviewedToday,
    week,
  };
}
