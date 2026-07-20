"use client";

import { useCallback, useEffect, useState } from "react";
import ReviewSession from "@/components/vocabulary/ReviewSession";
import {
  getTodaysReview,
  type ReviewWord,
} from "@/lib/review/getTodaysReview";

export default function ReviewPage() {
  const [words, setWords] = useState<ReviewWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const reviewWords = await getTodaysReview();
      setWords(reviewWords);
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

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-5">
        <p className="text-sm text-neutral-500">
          Loading today&apos;s review…
        </p>
      </main>
    );
  }

  if (error) {
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

  if (words.length === 0) {
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

  return (
    <main className="mx-auto min-h-[calc(100vh-5rem)] max-w-xl px-5 pb-8 pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Daily Review
        </h1>

        <p className="mt-1 text-sm text-neutral-500">
          Review the vocabulary scheduled for today.
        </p>
      </header>

      <ReviewSession words={words} />
    </main>
  );
}
