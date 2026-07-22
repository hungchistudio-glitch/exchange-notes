"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Infinity as InfinityIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import BackButton from "@/components/foundation/navigation/BackButton";
import ReviewSession from "@/components/vocabulary/ReviewSession";
import useTranslation from "@/hooks/i18n/useTranslation";
import {
  getAllReviewWords,
  getTodaysReview,
  type ReviewWord,
} from "@/lib/review/getTodaysReview";

type ReviewMode =
  | "scheduled"
  | "practice"
  | null;

function QueueMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between border-t border-black/[0.09] py-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/38">
        {label}
      </span>

      <span className="text-base font-semibold">
        {value}
      </span>
    </div>
  );
}

export default function ReviewPage() {
  const { t } = useTranslation();

  const [backHref, setBackHref] = useState("/home");

  useEffect(() => {
    const source = new URLSearchParams(
      window.location.search,
    ).get("from");

    setBackHref(
      source === "vocabulary"
        ? "/vocabulary"
        : "/home",
    );
  }, []);

  const [scheduledWords, setScheduledWords] =
    useState<ReviewWord[]>([]);

  const [allWords, setAllWords] =
    useState<ReviewWord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [mode, setMode] =
    useState<ReviewMode>(null);

  const loadReviews =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const [
          scheduled,
          everyWord,
        ] = await Promise.all([
          getTodaysReview(),
          getAllReviewWords(),
        ]);

        setScheduledWords(
          scheduled,
        );

        setAllWords(
          everyWord,
        );
      } catch (loadError) {
        console.error(loadError);
        setError(
          t.review.loadError,
        );
      } finally {
        setLoading(false);
      }
    }, [t.review.loadError]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const queueStats = useMemo(
    () => ({
      due: scheduledWords.length,
      total: allWords.length,
    }),
    [
      scheduledWords.length,
      allWords.length,
    ],
  );

  if (mode === "scheduled") {
    return (
      <ReviewSession
        words={scheduledWords}
        mode="scheduled"
        onExit={() => setMode(null)}
        exitHref={backHref}
      />
    );
  }

  if (mode === "practice") {
    return (
      <ReviewSession
        words={allWords}
        mode="practice"
        onExit={() => setMode(null)}
        exitHref={backHref}
      />
    );
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/35">
          {t.review.loadingQueue}
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto min-h-[calc(100vh-5rem)] max-w-xl px-5 pb-28 pt-6">
        <BackButton
          href={backHref}
          label={t.review.backHome}
        />

        <section className="mt-10 rounded-[28px] border border-black/[0.08] bg-white p-7 text-center shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/35">
            {t.review.system}
          </p>

          <p className="mt-5 text-sm leading-6 text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadReviews()
            }
            className="mt-7 min-h-[52px] w-full rounded-2xl bg-black px-5 text-sm font-semibold text-white"
          >
            {t.review.retry}
          </button>
        </section>
      </main>
    );
  }

  if (allWords.length === 0) {
    return (
      <main className="mx-auto min-h-[calc(100vh-5rem)] max-w-xl px-5 pb-28 pt-6">
        <BackButton
          href={backHref}
          label={t.review.backHome}
        />

        <section className="mt-10 rounded-[30px] border border-black/[0.08] bg-white p-8 text-center shadow-[0_18px_55px_rgba(0,0,0,0.05)]">
          <BookOpen
            size={30}
            strokeWidth={1.6}
            className="mx-auto text-black/45"
          />

          <h1 className="mt-7 text-[28px] font-semibold tracking-[-0.035em]">
            {t.review.noWordsTitle}
          </h1>

          <p className="mx-auto mt-3 max-w-sm text-[15px] leading-6 text-black/48">
            {t.review.noWordsDescription}
          </p>

          <Link
            href="/vocabulary/new"
            className="mt-8 flex min-h-[52px] items-center justify-center rounded-2xl bg-black px-5 text-sm font-semibold text-white"
          >
            {t.review.addWords}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-5rem)] max-w-xl px-5 pb-28 pt-6">
      <header>
        <BackButton
          href={backHref}
          label={t.review.backHome}
        />

        <div className="mt-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/38">
            {t.review.eyebrow}
          </p>

          <h1 className="mt-2 text-[38px] font-semibold tracking-[-0.05em]">
            {t.review.title}
          </h1>

          <p className="mt-3 max-w-md text-[15px] leading-6 text-black/48">
            {t.review.subtitle}
          </p>
        </div>
      </header>

      <section className="mt-8 overflow-hidden rounded-[28px] bg-black p-6 text-white">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
              {t.review.today}
            </p>

            <p className="mt-6 text-[58px] font-semibold leading-none tracking-[-0.065em]">
              {String(
                queueStats.due,
              ).padStart(2, "0")}
            </p>

            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
              {t.review.cardsReady}
            </p>
          </div>

          <p className="max-w-[170px] text-right text-sm leading-6 text-white/45">
            {queueStats.due > 0
              ? t.review.introLineOne
              : t.review.caughtUpDescription}
          </p>
        </div>

        {queueStats.due > 0 ? (
          <button
            type="button"
            onClick={() =>
              setMode("scheduled")
            }
            className="group mt-9 flex min-h-[58px] w-full items-center justify-between border-y border-white/15 text-left transition hover:border-white/35 active:scale-[0.995]"
          >
            <span className="text-[12px] font-semibold uppercase tracking-[0.2em]">
              {t.review.startReview}
            </span>

            <ArrowRight
              size={20}
              strokeWidth={1.7}
              className="transition-transform group-hover:translate-x-1"
            />
          </button>
        ) : null}
      </section>

      <section className="mt-4 rounded-[28px] border border-black/[0.08] bg-white p-6 shadow-[0_14px_45px_rgba(0,0,0,0.045)]">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black text-white">
            <InfinityIcon
              size={21}
              strokeWidth={1.8}
            />
          </span>

          <div>
            <h2 className="text-[20px] font-semibold tracking-[-0.025em]">
              {t.review.freePractice}
            </h2>

            <p className="mt-2 text-sm leading-6 text-black/45">
              {t.review.freePracticeDescription}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setMode("practice")
          }
          className="mt-6 flex min-h-[54px] w-full items-center justify-between rounded-2xl bg-black px-5 text-sm font-semibold text-white"
        >
          <span>
            {t.review.practiceAllWords}
          </span>

          <span>
            {queueStats.total}
          </span>
        </button>
      </section>

      <section className="mt-9">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-black/35">
          {t.review.queueData}
        </p>

        <QueueMetric
          label={t.review.ready}
          value={queueStats.due}
        />

        <QueueMetric
          label={t.review.freePractice}
          value={queueStats.total}
        />
      </section>
    </main>
  );
}
