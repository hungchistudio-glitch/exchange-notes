"use client";

import { useState } from "react";
import ReviewCard from "./ReviewCard";
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
  const [reviewedCount, setReviewedCount] = useState(0);

  const totalCount = words.length;
  const currentWord = queue[0];

  function handleGrade(grade: ReviewGrade) {
    setQueue((currentQueue) => {
      if (currentQueue.length === 0) {
        return currentQueue;
      }

      const [firstWord, ...remainingWords] = currentQueue;

      if (grade === "again") {
        return [...remainingWords, firstWord];
      }

      return remainingWords;
    });

    setReviewedCount((count) => count + 1);
  }

  if (!currentWord) {
    return (
      <section className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
        <div className="text-4xl">✓</div>

        <h2 className="mt-4 text-2xl font-bold">
          Review complete
        </h2>

        <p className="mt-2 text-neutral-500">
          You reviewed {reviewedCount} card
          {reviewedCount === 1 ? "" : "s"} today.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>
          {queue.length} remaining
        </span>

        <span>
          {totalCount === 0
            ? 0
            : Math.min(
                100,
                Math.round(
                  ((totalCount - queue.length) /
                    totalCount) *
                    100,
                ),
              )}
          %
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-black transition-all"
          style={{
            width: `${
              totalCount === 0
                ? 0
                : Math.min(
                    100,
                    ((totalCount - queue.length) /
                      totalCount) *
                      100,
                  )
            }%`,
          }}
        />
      </div>

      <ReviewCard
        key={`${currentWord.id}-${reviewedCount}`}
        english={currentWord.english}
        chinese={currentWord.chinese}
        example={currentWord.example}
        onGrade={handleGrade}
      />
    </section>
  );
}
