import type { VocabularyStats } from "@/types/vocabulary";

export function updateVocabularyStats(
  stats: VocabularyStats,
  correct: boolean
): VocabularyStats {
  const reviewCount = stats.reviewCount + 1;

  const correctCount =
    stats.correctCount + (correct ? 1 : 0);

  const incorrectCount =
    stats.incorrectCount + (correct ? 0 : 1);

  let difficulty: VocabularyStats["difficulty"];

  if (reviewCount >= 10 && correctCount >= 8) {
    difficulty = "mastered";
  } else if (reviewCount >= 3) {
    difficulty = "learning";
  } else {
    difficulty = "new";
  }

  return {
    reviewCount,
    correctCount,
    incorrectCount,
    difficulty,
    lastReviewedAt: new Date().toISOString(),
  };
}
