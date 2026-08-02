import {
  fetchVocabulary,
  getCurrentUser,
} from "@/lib/vocabulary/repository";
import { rankDailyLesson } from "@/lib/dailyLesson/lessonRanker";
import type { DailyLesson } from "@/lib/dailyLesson/lessonTypes";
import type { VocabularyItem } from "@/lib/types/app";

export async function getTodaysLesson(): Promise<DailyLesson | null> {
  const { user } = await getCurrentUser();

  if (!user) {
    return null;
  }

  const vocabulary = await fetchVocabulary(user.id);

  return rankDailyLesson(
    (vocabulary ?? []) as VocabularyItem[],
  );
}
