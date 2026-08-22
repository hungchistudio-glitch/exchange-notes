export type CoachWord = {
  id: string;
  word: string;
  translation: string;
  /** As stored — see VocabularyItem.language. Not read. */
  language: string;
  partOfSpeech: string | null;
  exampleSentence: string | null;
  status: "new" | "learning" | "mastered";
  retentionScore: number | null;
};

export type CoachDialogueLine = {
  speaker: string;
  text: string;
  translation: string;
};

export type CoachGrammarNote = {
  title: string;
  explanation: string;
  example: string;
  translation: string;
};

export type CoachQuizQuestion = {
  id: string;
  question: string;
  translation: string;
  options: string[];
  answer: string;
  explanation: string;
};

export type CoachLesson = {
  title: string;
  introduction: string;
  words: CoachWord[];
  story: string;
  storyTranslation: string;
  dialogue: CoachDialogueLine[];
  grammarNotes: CoachGrammarNote[];
  quiz: CoachQuizQuestion[];
};

export type SavedCoachLesson = CoachLesson & {
  id: string;
  status: "generated" | "in_progress" | "completed";
  createdAt: string;
  completedAt: string | null;
};
