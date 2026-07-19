"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getTodaysReview,
  type ReviewWord,
} from "@/lib/review/getTodaysReview";
import { saveReviewResult } from "@/lib/review/saveReviewResult";
import type { ReviewGrade } from "@/types/vocabulary";

const REVIEW_BUTTONS: Array<{
  grade: ReviewGrade;
  label: string;
  description: string;
}> = [
  {
    grade: "again",
    label: "Again",
    description: "10 min",
  },
  {
    grade: "hard",
    label: "Hard",
    description: "Short",
  },
  {
    grade: "good",
    label: "Good",
    description: "Normal",
  },
  {
    grade: "easy",
    label: "Easy",
    description: "Long",
  },
];

export default function ReviewPage() {
  const [words, setWords] = useState<ReviewWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [completedCount, setCompletedCount] = useState(0);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const reviewWords = await getTodaysReview();

      setWords(reviewWords);
      setCurrentIndex(0);
      setCompletedCount(0);
      setRevealed(false);
    } catch (loadError) {
      console.error(loadError);
      setError("Unable to load today's review.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const currentWord = words[currentIndex];
  const totalWords = words.length;
  const isFinished =
    !loading &&
    totalWords > 0 &&
    currentIndex >= totalWords;

  async function handleGrade(grade: ReviewGrade) {
    if (!currentWord || saving) return;

    setSaving(true);
    setError("");

    try {
      await saveReviewResult(currentWord.id, grade);

      setCompletedCount((count) => count + 1);
      setCurrentIndex((index) => index + 1);
      setRevealed(false);
    } catch (saveError) {
      console.error(saveError);
      setError("Unable to save this review. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-5">
        <p className="text-sm text-neutral-500">
          Loading today&apos;s review…
        </p>
      </main>
    );
  }

  if (error && words.length === 0) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="text-sm text-red-600">{error}</p>

        <button
          type="button"
          onClick={() => void loadReviews()}
          className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white"
        >
          Try again
        </button>
      </main>
    );
  }

  if (totalWords === 0) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-2xl">
          ✓
        </div>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          You&apos;re all caught up
        </h1>

        <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-500">
          There are no vocabulary cards due right now.
        </p>
      </main>
    );
  }

  if (isFinished) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black text-2xl text-white">
          ✓
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          Review complete
        </h1>

        <p className="mt-2 text-sm text-neutral-500">
          You reviewed {completedCount}{" "}
          {completedCount === 1 ? "word" : "words"} today.
        </p>

        <button
          type="button"
          onClick={() => void loadReviews()}
          className="mt-8 rounded-full border border-neutral-200 px-5 py-3 text-sm font-medium"
        >
          Check again
        </button>
      </main>
    );
  }

  const progress = Math.round(
    (currentIndex / totalWords) * 100,
  );

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl flex-col px-5 pb-8 pt-6">
      <header>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Daily Review
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              {currentIndex + 1} of {totalWords}
            </p>
          </div>

          <span className="text-sm font-medium text-neutral-500">
            {progress}%
          </span>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-black transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <section className="flex flex-1 flex-col justify-center py-8">
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="min-h-[330px] w-full rounded-[2rem] border border-neutral-200 bg-white px-8 py-10 text-center shadow-sm transition active:scale-[0.99]"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
            {revealed ? "Translation" : "Vocabulary"}
          </p>

          <h2 className="mt-8 break-words text-4xl font-semibold tracking-tight">
            {currentWord.english}
          </h2>

          {revealed ? (
            <div className="mt-8">
              <p className="text-2xl font-medium text-neutral-700">
                {currentWord.chinese}
              </p>

              {currentWord.example && (
                <p className="mx-auto mt-8 max-w-sm text-sm leading-6 text-neutral-500">
                  {currentWord.example}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-10 text-sm text-neutral-400">
              Tap to reveal the answer
            </p>
          )}
        </button>

        {error && (
          <p className="mt-4 text-center text-sm text-red-600">
            {error}
          </p>
        )}
      </section>

      <footer>
        {revealed ? (
          <div className="grid grid-cols-4 gap-2">
            {REVIEW_BUTTONS.map((button) => (
              <button
                key={button.grade}
                type="button"
                disabled={saving}
                onClick={() =>
                  void handleGrade(button.grade)
                }
                className="rounded-2xl border border-neutral-200 px-2 py-3.5 text-center transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="block text-sm font-semibold">
                  {button.label}
                </span>

                <span className="mt-1 block text-[11px] text-neutral-400">
                  {button.description}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="w-full rounded-2xl bg-black px-5 py-4 text-sm font-semibold text-white"
          >
            Show answer
          </button>
        )}
      </footer>
    </main>
  );
}
