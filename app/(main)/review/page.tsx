"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReviewSession from "@/components/vocabulary/ReviewSession";
import {
  getTodaysReview,
  type ReviewWord,
} from "@/lib/review/getTodaysReview";

function QueueMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between border-t border-black/10 py-3">
      <span className="text-[10px] font-medium uppercase tracking-[0.24em] text-neutral-500">
        {label}
      </span>

      <span className="text-sm font-semibold tracking-tight text-black">
        {value}
      </span>
    </div>
  );
}

export default function ReviewPage() {
  const [words, setWords] = useState<ReviewWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);

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

  const queueStats = useMemo(
    () => ({
      total: words.length,
    }),
    [words],
  );

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">
          Loading review queue
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-5 px-5 text-center">
        <div className="w-full max-w-sm border-y border-black/10 py-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-neutral-400">
            Review system
          </p>

          <p className="mt-4 text-sm text-red-600">
            {error}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadReviews()}
          className="w-full max-w-sm bg-black px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition active:scale-[0.99]"
        >
          Try again
        </button>
      </main>
    );
  }

  if (words.length === 0) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 text-center">
        <section className="w-full border-y border-black/10 py-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-neutral-400">
            Today
          </p>

          <p className="mt-5 text-5xl font-semibold tracking-[-0.06em]">
            00
          </p>

          <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.24em] text-neutral-500">
            Cards ready
          </p>
        </section>

        <h1 className="mt-8 text-2xl font-semibold tracking-tight">
          You&apos;re all caught up
        </h1>

        <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-500">
          There are no vocabulary cards due right now.
        </p>
      </main>
    );
  }

  if (started) {
    return (
      <main className="mx-auto min-h-[calc(100vh-5rem)] max-w-xl px-5 pb-8 pt-6">
        <header className="mb-6 flex items-center justify-between border-b border-black/10 pb-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-neutral-400">
              Daily review
            </p>

            <h1 className="mt-2 text-xl font-semibold tracking-tight">
              Session in progress
            </h1>
          </div>

          <span className="text-sm font-semibold">
            {queueStats.total}
          </span>
        </header>

        <ReviewSession words={words} />
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-5rem)] max-w-xl px-5 pb-8 pt-6">
      <section className="bg-black px-5 py-6 text-white">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">
              Today
            </p>

            <h1 className="mt-5 text-[52px] font-semibold leading-none tracking-[-0.065em]">
              {String(queueStats.total).padStart(2, "0")}
            </h1>

            <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.24em] text-white/40">
              Cards ready
            </p>
          </div>

          <p className="text-right text-xs leading-5 text-white/45">
            Review due cards first.
            <br />
            New words follow.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setStarted(true)}
          className="mt-8 w-full border-y border-white/15 py-4 text-left transition hover:border-white/35 active:scale-[0.995]"
        >
          <span className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">
              Start review
            </span>

            <span className="text-lg">→</span>
          </span>
        </button>
      </section>

      <section className="mt-8">
        <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.28em] text-neutral-400">
          Queue data
        </p>

        <QueueMetric
          label="Ready"
          value={queueStats.total}
        />

      </section>
    </main>
  );
}
