"use client";

import { useState } from "react";
import ReviewCard from "./ReviewCard";
import { saveReviewResult } from "@/lib/review/saveReviewResult";
import type { ReviewGrade } from "@/types/vocabulary";

export type ReviewWord = {
  id: string;
  english: string;
  chinese: string;
  example?: string | null;
};

type Props = {
  words: ReviewWord[];
};

export default function ReviewSession({
  words,
}: Props) {
  const [queue, setQueue] = useState(words);
  const [reviewedCount, setReviewedCount] =
    useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalCount = words.length;
  const currentWord = queue[0];

  async function handleGrade(
    grade: ReviewGrade,
  ) {
    if (!currentWord || saving) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await saveReviewResult(
        currentWord.id,
        grade,
      );

      setQueue((currentQueue) => {
        if (currentQueue.length === 0) {
          return currentQueue;
        }

        const [firstWord, ...remainingWords] =
          currentQueue;

        if (grade === "again") {
          return [
            ...remainingWords,
            firstWord,
          ];
        }

        return remainingWords;
      });

      setReviewedCount(
        (count) => count + 1,
      );
    } catch (reviewError) {
      console.error(reviewError);

      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Unable to save this review.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!currentWord) {
    return (
      <section className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
        <div className="text-4xl">✓</div>

        <h2 className="mt-4 text-2xl font-bold">
          Review complete
        </h2>

        <p className="mt-2 text-neutral-500">
          You completed {reviewedCount} review
          {reviewedCount === 1 ? "" : "s"}.
        </p>
      </section>
    );
  }

  const completedCount = Math.max(
    0,
    totalCount - queue.length,
  );

  const progress =
    totalCount === 0
      ? 0
      : Math.min(
          100,
          Math.round(
            (completedCount / totalCount) * 100,
          ),
        );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>{queue.length} remaining</span>
        <span>{progress}%</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-black transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <ReviewCard
        key={`${currentWord.id}-${reviewedCount}`}
        english={currentWord.english}
        chinese={currentWord.chinese}
        example={currentWord.example}
        onGrade={handleGrade}
        disabled={saving}
      />

      {saving && (
        <p className="text-center text-sm text-neutral-500">
          Saving review…
        </p>
      )}
    </section>
  );
}
