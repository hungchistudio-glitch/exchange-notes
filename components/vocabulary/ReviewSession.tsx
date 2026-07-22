"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import { saveReviewResult } from "@/lib/review/saveReviewResult";
import type { ReviewGrade } from "@/types/vocabulary";

import ReviewCard from "./ReviewCard";

export type ReviewWord = {
  id: string;
  english: string;
  chinese: string;
  englishExample?: string | null;
  chineseExample?: string | null;
};

type Props = {
  words: ReviewWord[];
  onExit: () => void;
  exitHref?: string;
  mode: "scheduled" | "practice";
};

function insertValues(
  template: string,
  values: Record<string, string | number>,
) {
  return Object.entries(values).reduce(
    (result, [key, value]) =>
      result.replace(
        `{${key}}`,
        String(value),
      ),
    template,
  );
}

export default function ReviewSession({
  words,
  onExit,
  mode,
  exitHref = "/home",
}: Props) {
  const { t } = useTranslation();

  const [queue, setQueue] =
    useState(words);

  const [reviewedCount, setReviewedCount] =
    useState(0);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const totalCount = words.length;
  const currentWord = queue[0];

  const isPracticeMode =
    mode === "practice";

  async function handleGrade(
    grade: ReviewGrade,
  ) {
    if (!currentWord || saving) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      /*
       * Scheduled review updates SM-2.
       * Free practice deliberately leaves the
       * scheduled review date unchanged.
       */
      if (!isPracticeMode) {
        await saveReviewResult(
          currentWord.id,
          grade,
        );
      }

      setQueue((currentQueue) => {
        if (currentQueue.length === 0) {
          return currentQueue;
        }

        const [
          firstWord,
          ...remainingWords
        ] = currentQueue;

        if (grade === "again") {
          return [
            ...remainingWords,
            firstWord,
          ];
        }

        return remainingWords;
      });

      if (grade !== "again") {
        setReviewedCount(
          (count) => count + 1,
        );
      }
    } catch (reviewError) {
      console.error(reviewError);

      setError(
        reviewError instanceof Error
          ? reviewError.message
          : t.review.saveError,
      );
    } finally {
      setSaving(false);
    }
  }

  function restartSession() {
    setQueue([...words]);
    setReviewedCount(0);
    setSaving(false);
    setError("");
  }

  if (!currentWord) {
    return (
      <main className="mx-auto min-h-[calc(100vh-5rem)] max-w-xl px-5 pb-28 pt-6">
        <button
          type="button"
          onClick={onExit}
          aria-label={t.review.backReview}
          className="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-black/[0.05]"
        >
          <ArrowLeft
            size={22}
            strokeWidth={1.8}
          />
        </button>

        <section className="mt-8 rounded-[30px] border border-black/[0.08] bg-white p-7 text-center shadow-[0_18px_55px_rgba(0,0,0,0.06)]">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-black text-white">
            <Check
              size={25}
              strokeWidth={2}
            />
          </span>

          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-black/35">
            {t.review.completeEyebrow}
          </p>

          <h1 className="mt-3 text-[32px] font-semibold tracking-[-0.04em]">
            {t.review.completeTitle}
          </h1>

          <p className="mx-auto mt-3 max-w-sm text-[15px] leading-6 text-black/48">
            {isPracticeMode
              ? t.review.freePracticeDescription
              : t.review.completeDescription}
          </p>

          <p className="mt-7 text-sm font-semibold">
            {insertValues(
              t.review.completedReviews,
              {
                count: reviewedCount,
              },
            )}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={restartSession}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-black px-5 text-sm font-semibold text-white"
            >
              <RotateCcw
                size={16}
                strokeWidth={1.8}
              />

              {t.review.reviewAgain}
            </button>

            <Link
              href={exitHref}
              className="flex min-h-[52px] items-center justify-center rounded-2xl bg-black/[0.055] px-5 text-sm font-semibold text-black/65"
            >
              {t.review.backToHome}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const progress =
    totalCount === 0
      ? 0
      : Math.min(
          100,
          Math.round(
            (reviewedCount /
              totalCount) *
              100,
          ),
        );

  return (
    <main className="mx-auto min-h-[calc(100vh-5rem)] max-w-xl px-5 pb-28 pt-6">
      <header>
        <button
          type="button"
          onClick={onExit}
          aria-label={t.review.backReview}
          className="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-black/[0.05]"
        >
          <ArrowLeft
            size={22}
            strokeWidth={1.8}
          />
        </button>

        <div className="mt-7 flex items-end justify-between gap-5 border-b border-black/[0.09] pb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/35">
              {isPracticeMode
                ? t.review.practiceEyebrow
                : t.review.sessionEyebrow}
            </p>

            <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.035em]">
              {isPracticeMode
                ? t.review.practiceTitle
                : t.review.sessionTitle}
            </h1>
          </div>

          <span className="pb-1 text-sm font-semibold">
            {reviewedCount + 1} /{" "}
            {totalCount}
          </span>
        </div>
      </header>

      <section className="mt-6">
        <div
          aria-label={insertValues(
            t.review.progressAriaLabel,
            {
              completed:
                reviewedCount,
              total: totalCount,
            },
          )}
        >
          <div className="flex items-center justify-between text-sm text-black/45">
            <span>
              {insertValues(
                t.review.remaining,
                {
                  count:
                    queue.length,
                },
              )}
            </span>

            <span>{progress}%</span>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/[0.055]">
            <div
              className="h-full rounded-full bg-black transition-[width] duration-500"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-6">
          <ReviewCard
            key={`${currentWord.id}-${reviewedCount}`}
            english={
              currentWord.english
            }
            chinese={
              currentWord.chinese
            }
            englishExample={
              currentWord.englishExample
            }
            chineseExample={
              currentWord.chineseExample
            }
            onGrade={handleGrade}
            disabled={saving}
          />
        </div>

        {saving ? (
          <p className="mt-4 text-center text-sm text-black/40">
            {t.review.saving}
          </p>
        ) : null}
      </section>
    </main>
  );
}
