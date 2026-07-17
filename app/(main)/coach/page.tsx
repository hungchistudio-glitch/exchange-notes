"use client";

import { useEffect, useMemo, useState } from "react";

import { selectCoachWords } from "@/lib/coach/selectWords";
import type {
  CoachLesson,
  CoachQuizQuestion,
} from "@/lib/coach/types";
import { createClient } from "@/lib/supabase/client";
import type { VocabularyItem } from "@/lib/types/app";

type QuizAnswers = Record<string, string>;

export default function CoachPage() {
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [lesson, setLesson] = useState<CoachLesson | null>(null);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [showResults, setShowResults] = useState(false);

  const [loadingWords, setLoadingWords] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const selectedWords = useMemo(
    () => selectCoachWords(vocabulary, 8),
    [vocabulary]
  );

  useEffect(() => {
    let active = true;

    async function loadVocabulary() {
      setLoadingWords(true);
      setError("");

      try {
        const supabase = createClient();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          throw new Error("Please sign in to use AI Coach.");
        }

        const { data, error: vocabularyError } = await supabase
          .from("vocabulary_items")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (vocabularyError) {
          throw vocabularyError;
        }

        if (active) {
          setVocabulary((data ?? []) as VocabularyItem[]);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load vocabulary."
          );
        }
      } finally {
        if (active) {
          setLoadingWords(false);
        }
      }
    }

    void loadVocabulary();

    return () => {
      active = false;
    };
  }, []);

  async function saveLesson(
    generatedLesson: CoachLesson
  ): Promise<void> {
    setSaving(true);
    setSaveMessage("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("Please sign in to save lessons.");
      }

      const { error: insertError } = await supabase
        .from("ai_lessons")
        .insert({
          user_id: user.id,
          title: generatedLesson.title,
          introduction: generatedLesson.introduction,
          selected_words: generatedLesson.words,
          story: generatedLesson.story,
          story_translation:
            generatedLesson.storyTranslation,
          dialogue: generatedLesson.dialogue,
          grammar_notes: generatedLesson.grammarNotes,
          quiz: generatedLesson.quiz,
          status: "generated",
        });

      if (insertError) {
        throw insertError;
      }

      setSaveMessage("Lesson saved.");
    } catch (saveError) {
      setSaveMessage(
        saveError instanceof Error
          ? `Lesson created, but could not save: ${saveError.message}`
          : "Lesson created, but could not save."
      );
    } finally {
      setSaving(false);
    }
  }

  async function generateLesson() {
    if (selectedWords.length < 3) {
      setError(
        "Add at least three vocabulary words before generating a lesson."
      );
      return;
    }

    setGenerating(true);
    setError("");
    setSaveMessage("");
    setAnswers({});
    setShowResults(false);

    try {
      const response = await fetch("/api/coach/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          words: selectedWords,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Could not generate lesson."
        );
      }

      const generatedLesson = data.lesson as CoachLesson;

      setLesson(generatedLesson);
      await saveLesson(generatedLesson);
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Could not generate lesson."
      );
    } finally {
      setGenerating(false);
    }
  }

  function selectAnswer(
    question: CoachQuizQuestion,
    option: string
  ) {
    if (showResults) return;

    setAnswers((current) => ({
      ...current,
      [question.id]: option,
    }));
  }

  const score = lesson
    ? lesson.quiz.reduce((total, question) => {
        return answers[question.id] === question.answer
          ? total + 1
          : total;
      }, 0)
    : 0;

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 pb-32 pt-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">
          Personalized practice
        </p>

        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-neutral-950">
          AI Vocabulary Coach
        </h1>

        <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-500">
          Turn your saved vocabulary into a story, conversation,
          grammar lesson, and quiz.
        </p>
      </header>

      {error ? (
        <div className="mb-6 rounded-3xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {!lesson ? (
        <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                Today&apos;s words
              </p>

              <h2 className="mt-2 text-2xl font-semibold text-neutral-950">
                Your personalized lesson
              </h2>
            </div>

            <div className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
              {selectedWords.length} words
            </div>
          </div>

          {loadingWords ? (
            <p className="mt-8 text-sm text-neutral-500">
              Loading your vocabulary...
            </p>
          ) : selectedWords.length > 0 ? (
            <div className="mt-7 flex flex-wrap gap-2">
              {selectedWords.map((word) => (
                <span
                  key={word.id}
                  className="rounded-full border border-black/10 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-800"
                >
                  {word.word}
                  <span className="ml-2 text-neutral-400">
                    {word.translation}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-7 rounded-3xl bg-neutral-50 p-5">
              <p className="font-medium text-neutral-900">
                No vocabulary yet
              </p>
              <p className="mt-1 text-sm leading-6 text-neutral-500">
                Add at least three words to Vocabulary before
                generating your first lesson.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => void generateLesson()}
            disabled={
              generating ||
              loadingWords ||
              selectedWords.length < 3
            }
            className="mt-8 w-full rounded-full bg-neutral-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {generating
              ? "Creating your lesson..."
              : "Generate today’s lesson"}
          </button>
        </section>
      ) : (
        <div className="space-y-6">
          <section className="rounded-[2rem] bg-neutral-950 p-7 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              Today&apos;s lesson
            </p>

            <h2 className="mt-3 text-3xl font-semibold">
              {lesson.title}
            </h2>

            <p className="mt-4 text-sm leading-7 text-white/70">
              {lesson.introduction}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {lesson.words.map((word) => (
                <span
                  key={word.id}
                  className="rounded-full bg-white/10 px-3 py-2 text-xs font-medium"
                >
                  {word.word} · {word.translation}
                </span>
              ))}
            </div>
          </section>

          <LessonSection title="Story">
            <p className="whitespace-pre-line text-base leading-8 text-neutral-900">
              {lesson.story}
            </p>

            <div className="mt-6 border-t border-black/5 pt-6">
              <p className="whitespace-pre-line text-sm leading-7 text-neutral-500">
                {lesson.storyTranslation}
              </p>
            </div>
          </LessonSection>

          <LessonSection title="Conversation">
            <div className="space-y-4">
              {lesson.dialogue.map((line, index) => (
                <div
                  key={`${line.speaker}-${index}`}
                  className="rounded-3xl bg-neutral-50 p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    {line.speaker}
                  </p>
                  <p className="mt-2 font-medium leading-7 text-neutral-900">
                    {line.text}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    {line.translation}
                  </p>
                </div>
              ))}
            </div>
          </LessonSection>

          <LessonSection title="Grammar notes">
            <div className="space-y-5">
              {lesson.grammarNotes.map((note, index) => (
                <div
                  key={`${note.title}-${index}`}
                  className="border-b border-black/5 pb-5 last:border-none last:pb-0"
                >
                  <h3 className="font-semibold text-neutral-950">
                    {note.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-neutral-600">
                    {note.explanation}
                  </p>
                  <div className="mt-3 rounded-2xl bg-neutral-50 p-4">
                    <p className="font-medium text-neutral-900">
                      {note.example}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {note.translation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </LessonSection>

          <LessonSection title="Quiz">
            <div className="space-y-8">
              {lesson.quiz.map((question, index) => {
                const selected = answers[question.id];
                const correct =
                  selected === question.answer;

                return (
                  <div key={question.id}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      Question {index + 1}
                    </p>

                    <h3 className="mt-2 text-lg font-semibold leading-7 text-neutral-950">
                      {question.question}
                    </h3>

                    <p className="mt-1 text-sm text-neutral-500">
                      {question.translation}
                    </p>

                    <div className="mt-4 grid gap-2">
                      {question.options.map((option) => {
                        const isSelected =
                          selected === option;
                        const isCorrectAnswer =
                          showResults &&
                          option === question.answer;

                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() =>
                              selectAnswer(question, option)
                            }
                            className={[
                              "rounded-2xl border px-4 py-3 text-left text-sm font-medium transition",
                              isCorrectAnswer
                                ? "border-green-600 bg-green-50 text-green-800"
                                : isSelected &&
                                    showResults &&
                                    !correct
                                  ? "border-red-500 bg-red-50 text-red-700"
                                  : isSelected
                                    ? "border-neutral-950 bg-neutral-950 text-white"
                                    : "border-black/10 bg-white text-neutral-800 hover:bg-neutral-50",
                            ].join(" ")}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>

                    {showResults ? (
                      <p
                        className={[
                          "mt-3 text-sm leading-6",
                          correct
                            ? "text-green-700"
                            : "text-red-700",
                        ].join(" ")}
                      >
                        {question.explanation}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {!showResults ? (
              <button
                type="button"
                onClick={() => setShowResults(true)}
                disabled={
                  Object.keys(answers).length <
                  lesson.quiz.length
                }
                className="mt-8 w-full rounded-full bg-neutral-950 px-5 py-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                Check answers
              </button>
            ) : (
              <div className="mt-8 rounded-3xl bg-neutral-950 p-6 text-white">
                <p className="text-sm text-white/60">
                  Your score
                </p>
                <p className="mt-1 text-4xl font-semibold">
                  {score} / {lesson.quiz.length}
                </p>
              </div>
            )}
          </LessonSection>

          {saveMessage ? (
            <p className="text-center text-sm text-neutral-500">
              {saving ? "Saving lesson..." : saveMessage}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setLesson(null);
              setAnswers({});
              setShowResults(false);
              setSaveMessage("");
            }}
            className="w-full rounded-full border border-black/10 bg-white px-5 py-4 text-sm font-semibold text-neutral-900"
          >
            Create another lesson
          </button>
        </div>
      )}
    </main>
  );
}

function LessonSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-2xl font-semibold tracking-tight text-neutral-950">
        {title}
      </h2>
      {children}
    </section>
  );
}
