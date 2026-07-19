import type { VocabularyItem } from "@/lib/types/app";
import type {
  DailyLesson,
  DailyLessonReason,
} from "@/lib/dailyLesson/lessonTypes";

type RankedVocabulary = {
  item: VocabularyItem;
  priority: number;
  createdAt: number;
};

function getPriority(item: VocabularyItem): number {
  switch (item.status) {
    case "learning":
      return 3;

    case "new":
      return 2;

    case "mastered":
      return 1;

    default:
      return 0;
  }
}

function getCreatedAt(item: VocabularyItem): number {
  const candidate = item as VocabularyItem & {
    created_at?: unknown;
  };

  if (typeof candidate.created_at !== "string") {
    return 0;
  }

  const timestamp = new Date(candidate.created_at).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getReason(item: VocabularyItem): DailyLessonReason {
  switch (item.status) {
    case "learning":
      return "continue-learning";

    case "new":
      return "learn-new";

    default:
      return "refresh-memory";
  }
}

function getReasonLabel(reason: DailyLessonReason): string {
  switch (reason) {
    case "continue-learning":
      return "Continue learning";

    case "learn-new":
      return "Learn something new";

    case "refresh-memory":
      return "Refresh your memory";
  }
}

function getDailyIndex(length: number, date: Date): number {
  if (length <= 1) {
    return 0;
  }

  const dateKey = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");

  const numericDate = Number(dateKey);

  return numericDate % length;
}

export function rankDailyLesson(
  items: VocabularyItem[],
  date = new Date(),
): DailyLesson | null {
  if (items.length === 0) {
    return null;
  }

  const ranked: RankedVocabulary[] = items
    .map((item) => ({
      item,
      priority: getPriority(item),
      createdAt: getCreatedAt(item),
    }))
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      return b.createdAt - a.createdAt;
    });

  const highestPriority = ranked[0]?.priority ?? 0;

  const candidates = ranked.filter(
    (entry) => entry.priority === highestPriority,
  );

  const selected =
    candidates[getDailyIndex(candidates.length, date)] ??
    ranked[0];

  if (!selected) {
    return null;
  }

  const reason = getReason(selected.item);

  return {
    item: selected.item,
    reason,
    reasonLabel: getReasonLabel(reason),
  };
}
