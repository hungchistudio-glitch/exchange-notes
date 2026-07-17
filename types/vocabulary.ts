export type ReviewGrade =
  | "again"
  | "hard"
  | "good"
  | "easy";

export type VocabularyDifficulty =
  | "new"
  | "learning"
  | "mastered";

export type VocabularyStats = {
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  lastReviewedAt: string | null;
  difficulty: VocabularyDifficulty;
};

export const defaultVocabularyStats: VocabularyStats = {
  reviewCount: 0,
  correctCount: 0,
  incorrectCount: 0,
  lastReviewedAt: null,
  difficulty: "new",
};
