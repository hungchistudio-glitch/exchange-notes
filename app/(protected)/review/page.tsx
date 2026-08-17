"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import MissionCompleteStage from "@/components/cosmic/MissionCompleteStage";
import MissionLaunchStage from "@/components/cosmic/MissionLaunchStage";
import Screen from "@/components/foundation/layout/Screen";
import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import {
  getAllReviewWords,
  getTodaysReview,
  type ReviewWord,
} from "@/lib/review/getTodaysReview";
import { saveReviewResult } from "@/lib/review/saveReviewResult";
import type { ReviewGrade } from "@/types/vocabulary";
import { speak } from "@/lib/speech";
import useTranslation from "@/hooks/i18n/useTranslation";

type Phase = "landing" | "session" | "complete";
type Mode = "due" | "all";

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M5 12h13M13 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfinityIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="M6.5 9.5a3 3 0 100 6 3 3 0 002.2-1l6.6-7a3 3 0 112.2 5 3 3 0 01-2.2-1l-6.6-7a3 3 0 10-2.2 5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="M4 9.5h3.2L11 6v12l-3.8-3.5H4v-5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15 9a3.5 3.5 0 010 6" strokeLinecap="round" />
    </svg>
  );
}

const GRADE_OPTIONS: {
  value: ReviewGrade;
  className: string;
}[] = [
  {
    value: "again",
    className: "border-red-100 bg-red-50 text-red-600",
  },
  {
    value: "hard",
    className: "border-orange-100 bg-orange-50 text-orange-600",
  },
  {
    value: "good",
    className: "border-emerald-100 bg-emerald-50 text-emerald-700",
  },
  {
    value: "easy",
    className: "border-blue-100 bg-blue-50 text-blue-700",
  },
];

export default function ReviewPage() {
  const { t } = useTranslation();
  const copy = t.review;
  const { isCosmic } = useInterfaceMode();

  const [phase, setPhase] = useState<Phase>("landing");
  const [mode, setMode] = useState<Mode>("due");
  // Bumped on every session start so the launch sequence replays for a second
  // review without the component needing to be torn down and remounted.
  const [launchToken, setLaunchToken] = useState(0);

  const [dueWords, setDueWords] = useState<ReviewWord[]>([]);
  const [allWords, setAllWords] = useState<ReviewWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [queue, setQueue] = useState<ReviewWord[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage("");

      try {
        const [due, all] = await Promise.all([
          getTodaysReview(),
          getAllReviewWords(),
        ]);

        if (active) {
          setDueWords(due);
          setAllWords(all);
        }
      } catch (error) {
        if (active) {
          console.error(error);
          setErrorMessage(copy.loadError);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const startSession = useCallback(
    (selectedMode: Mode) => {
      const source = selectedMode === "due" ? dueWords : allWords;

      if (source.length === 0) {
        return;
      }

      setMode(selectedMode);
      setQueue(source);
      setIndex(0);
      setRevealed(false);
      setPhase("session");
      setLaunchToken((token) => token + 1);
    },
    [dueWords, allWords],
  );

  async function handleGrade(grade: ReviewGrade) {
    const currentWord = queue[index];

    if (!currentWord || grading) {
      return;
    }

    setGrading(true);

    try {
      await saveReviewResult(currentWord.id, grade);
    } catch (error) {
      console.error(error);
      setErrorMessage(copy.saveError);
    } finally {
      setGrading(false);
    }

    if (index + 1 >= queue.length) {
      setPhase("complete");
      return;
    }

    setIndex((current) => current + 1);
    setRevealed(false);
  }

  if (phase === "session" && queue.length > 0) {
    const currentWord = queue[index];
    const remaining = queue.length - index;
    const progress = Math.round((index / queue.length) * 100);

    return (
      <Screen>
        {isCosmic && <MissionLaunchStage key={launchToken} />}

        <div
          className="px-4"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.5rem)" }}
        >
          <button
            type="button"
            onClick={() => setPhase("landing")}
            aria-label="Back"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-black/60 transition hover:bg-black/[0.04]"
          >
            <BackIcon />
          </button>

          <div className="mt-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                {copy.sessionEyebrow}
              </p>
              <h1 className="mt-1 text-[26px] font-bold tracking-[-0.02em]">
                {copy.sessionTitle}
              </h1>
            </div>

            <p className="shrink-0 pt-1 text-sm font-bold text-black">
              {index + 1} / {queue.length}
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-ink-soft">
            <span>{copy.remaining.replace("{count}", String(remaining))}</span>
            <span>{progress}%</span>
          </div>

          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
            <div
              className="h-full rounded-full bg-black transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-6 rounded-[28px] border border-line bg-white p-6">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                {copy.vocabulary}
              </p>
              <button
                type="button"
                onClick={() => speak(currentWord.chinese, "zh-TW")}
                aria-label="Listen"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line"
              >
                <SpeakerIcon />
              </button>
            </div>

            <p className="mt-4 text-[36px] font-bold tracking-[-0.02em]">
              {currentWord.chinese}
            </p>

            {revealed && (
              <>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-5">
                  <p className="text-2xl font-bold">{currentWord.english}</p>
                  <button
                    type="button"
                    onClick={() => speak(currentWord.english, "en-US")}
                    aria-label="Listen"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line"
                  >
                    <SpeakerIcon />
                  </button>
                </div>

                {currentWord.englishExample && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3">
                    <p className="text-sm leading-6">
                      {currentWord.englishExample}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        speak(currentWord.englishExample as string, "en-US")
                      }
                      aria-label="Listen to English example"
                      className="shrink-0"
                    >
                      <SpeakerIcon />
                    </button>
                  </div>
                )}

                {currentWord.chineseExample && (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3">
                    <p className="text-sm leading-6">
                      {currentWord.chineseExample}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        speak(currentWord.chineseExample as string, "zh-TW")
                      }
                      aria-label="Listen to Chinese example"
                      className="shrink-0"
                    >
                      <SpeakerIcon />
                    </button>
                  </div>
                )}
              </>
            )}

            {!revealed ? (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-black text-base font-semibold text-white transition active:scale-[0.99]"
              >
                {copy.revealAnswer}
              </button>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-3">
                {GRADE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={grading}
                    onClick={() => handleGrade(option.value)}
                    className={`rounded-2xl border px-4 py-4 text-left transition active:scale-[0.98] disabled:opacity-50 ${option.className}`}
                  >
                    <p className="text-base font-bold">
                      {copy.grades[option.value].label}
                    </p>
                    <p className="mt-0.5 text-xs opacity-70">
                      {copy.grades[option.value].description}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {errorMessage && (
            <p className="mt-4 text-sm font-semibold text-red-600">
              {errorMessage}
            </p>
          )}
        </div>
      </Screen>
    );
  }

  if (phase === "complete") {
    /*
     * The same result in both modes. Cosmic Mode reframes it as a mission and
     * gives it a moment of orbital alignment around it, but the count is the
     * count — no score, no bonus, nothing added that the session did not
     * actually do.
     */
    const summary = (
      <>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black text-2xl text-white">
          ✓
        </div>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {isCosmic
            ? t.cosmic.mission.completeEyebrow
            : mode === "due"
              ? copy.today
              : copy.freePractice}
        </p>
        <h1 className="mt-1 text-2xl font-bold">{copy.completeTitle}</h1>
        <p className="mt-2 max-w-xs text-ink-soft">
          {copy.completedReviews.replace("{count}", String(queue.length))}
          {" "}
          {copy.completeDescription}
        </p>

        <Link
          href="/"
          transitionTypes={isCosmic ? ["deck-return"] : undefined}
          className="mt-6 flex h-12 items-center justify-center gap-2 rounded-full bg-black px-6 text-sm font-semibold text-white"
        >
          {copy.backToHome}
        </Link>
      </>
    );

    return (
      <Screen>
        <div
          className="flex min-h-[70dvh] flex-col items-center justify-center px-4 text-center"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          {isCosmic ? (
            <MissionCompleteStage>
              <div className="flex flex-col items-center">{summary}</div>
            </MissionCompleteStage>
          ) : (
            summary
          )}
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <div
        className="px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.5rem)" }}
      >
        <Link
          href="/"
          transitionTypes={isCosmic ? ["deck-return"] : undefined}
          aria-label="Back"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-black/60 transition hover:bg-black/[0.04]"
        >
          <BackIcon />
        </Link>

        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {copy.eyebrow}
        </p>
        <h1 className="mt-1 text-[28px] font-bold tracking-[-0.02em]">
          {copy.title}
        </h1>
        <p className="mt-1 text-ink-soft">{copy.subtitle}</p>

        {errorMessage && (
          <p className="mt-4 text-sm font-semibold text-red-600">
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          onClick={() => startSession("due")}
          disabled={loading || dueWords.length === 0}
          className="mt-6 block w-full rounded-[28px] bg-black p-6 text-left text-white transition active:scale-[0.99] disabled:opacity-50"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-invert-faint">
              {copy.today}
            </p>
            <p className="text-xs text-ink-invert-faint">{copy.introLineOne}</p>
          </div>

          <p className="mt-3 text-[40px] font-bold leading-none">
            {loading ? "…" : dueWords.length}
          </p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-invert-faint">
            {copy.cardsReady}
          </p>

          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-sm font-semibold">
            {copy.startReview}
            <ArrowRightIcon />
          </div>
        </button>

        <div className="mt-4 rounded-[28px] border border-line bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-white">
              <InfinityIcon />
            </div>
            <p className="text-lg font-bold">{copy.freePractice}</p>
          </div>

          <p className="mt-2 text-sm text-ink-soft">
            {copy.freePracticeDescription}
          </p>

          <button
            type="button"
            onClick={() => startSession("all")}
            disabled={loading || allWords.length === 0}
            className="mt-4 flex h-14 w-full items-center justify-between rounded-2xl bg-black px-5 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-50"
          >
            {copy.practiceAllWords}
            <span>{loading ? "…" : allWords.length}</span>
          </button>
        </div>

        <div className="mt-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            {copy.queueData}
          </p>

          <div className="mt-2 divide-y divide-line border-y border-line">
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="text-ink-soft">{copy.ready}</span>
              <span className="font-bold">
                {loading ? "…" : dueWords.length}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="text-ink-soft">{copy.freePractice}</span>
              <span className="font-bold">
                {loading ? "…" : allWords.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Screen>
  );
}
