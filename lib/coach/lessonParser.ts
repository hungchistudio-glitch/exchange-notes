import type {
  CoachDialogueLine,
  CoachGrammarNote,
  CoachLesson,
  CoachQuizQuestion,
  CoachWord,
} from "@/lib/coach/types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(
  value: Record<string, unknown>,
  key: string
): string {
  return typeof value[key] === "string"
    ? value[key].trim()
    : "";
}

function parseDialogue(value: unknown): CoachDialogueLine[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isObject)
    .map((line) => ({
      speaker: readString(line, "speaker"),
      text: readString(line, "text"),
      translation: readString(line, "translation"),
    }))
    .filter((line) => line.speaker && line.text);
}

function parseGrammarNotes(value: unknown): CoachGrammarNote[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isObject)
    .map((note) => ({
      title: readString(note, "title"),
      explanation: readString(note, "explanation"),
      example: readString(note, "example"),
      translation: readString(note, "translation"),
    }))
    .filter((note) => note.title && note.explanation);
}

function parseQuiz(value: unknown): CoachQuizQuestion[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isObject)
    .map((question, index) => ({
      id:
        readString(question, "id") ||
        `question-${index + 1}`,
      question: readString(question, "question"),
      translation: readString(question, "translation"),
      options: Array.isArray(question.options)
        ? question.options.filter(
            (option): option is string =>
              typeof option === "string"
          )
        : [],
      answer: readString(question, "answer"),
      explanation: readString(question, "explanation"),
    }))
    .filter(
      (question) =>
        question.question &&
        question.answer &&
        question.options.length >= 2
    );
}

export function parseCoachLesson(
  value: unknown,
  words: CoachWord[]
): CoachLesson {
  if (!isObject(value)) {
    throw new Error("Gemini returned an invalid lesson.");
  }

  const lesson: CoachLesson = {
    title: readString(value, "title"),
    introduction: readString(value, "introduction"),
    words,
    story: readString(value, "story"),
    storyTranslation: readString(
      value,
      "storyTranslation"
    ),
    dialogue: parseDialogue(value.dialogue),
    grammarNotes: parseGrammarNotes(value.grammarNotes),
    quiz: parseQuiz(value.quiz),
  };

  if (
    !lesson.title ||
    !lesson.story ||
    lesson.dialogue.length === 0 ||
    lesson.quiz.length === 0
  ) {
    throw new Error("Gemini returned an incomplete lesson.");
  }

  return lesson;
}
