"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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
import LanguageOriginBadge from "@/components/language/LanguageOriginBadge";
import { getLanguage, type LanguageCode } from "@/lib/languages";
import { insertValues } from "@/lib/utils";
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
  const searchParams = useSearchParams();

  /**
   * Where leaving this page goes back to.
   *
   * Both back affordances used to be a hard-coded "/", which sent every entry
   * from the vocabulary page — the Yumi Command Halo's Practice node and the
   * hero's own review button, both of which have always passed
   * ?from=vocabulary — to the home screen instead of the list the session was
   * started from. The parameter was being sent and never read.
   *
   * Matched against a fixed set rather than used as a path, on the same
   * reading as the capture page's Cancel: the value comes from the query
   * string, and treating it as a destination would be an open redirect.
   */
  const cameFromVocabulary = searchParams.get("from") === "vocabulary";
  const exitHref = cameFromVocabulary ? "/vocabulary" : "/";
  /*
   * The arrival has to match the destination too. "deck-return" plays the
   * Command Deck coming back, which is the wrong room entirely when the
   * destination is the lexicon — see CosmicRouteStage for the pairing.
   */
  const exitTransition = cameFromVocabulary ? "lexicon-return" : "deck-return";

  const [phase, setPhase] = useState<Phase>("landing");
  const [mode, setMode] = useState<Mode>("due");
  // Bumped on every session start so the launch sequence replays for a second
  // review without the component needing to be torn down and remounted.
  const [launchToken, setLaunchToken] = useState(0);

  const [dueWords, setDueWords] = useState<ReviewWord[]>([]);
  const [allWords, setAllWords] = useState<ReviewWord[]>([]);

  /**
   * Which language to review, or null for every one of them.
   *
   * A mixed-language library makes an all-languages session a session that
   * changes language every card, which is a different and much harder
   * exercise than the one the reader thought they were starting. This does
   * not touch a single row — it decides what goes into the queue, and the
   * words keep their own languages either way.
   */
  const [reviewLanguage, setReviewLanguage] = useState<LanguageCode | null>(
    null,
  );
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
    // Loaded once on mount. Only the copy for the failure message is missing,
    // and depending on it would re-fetch the whole review set every time the
    // language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * Which languages the queue actually holds, and how many of each. Taken
   * from the whole library rather than from what is due, so the control does
   * not appear and vanish as words come up for review.
   */
  const languageCounts = allWords.reduce((counts, word) => {
    counts.set(word.termLanguage, (counts.get(word.termLanguage) ?? 0) + 1);
    return counts;
  }, new Map<LanguageCode, number>());

  const inReviewLanguage = (word: ReviewWord) =>
    !reviewLanguage || word.termLanguage === reviewLanguage;

  const dueInLanguage = dueWords.filter(inReviewLanguage);
  const allInLanguage = allWords.filter(inReviewLanguage);

  const startSession = useCallback(
    (selectedMode: Mode) => {
      const source = (
        selectedMode === "due" ? dueWords : allWords
      ).filter(
        (word) => !reviewLanguage || word.termLanguage === reviewLanguage,
      );

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
    [dueWords, allWords, reviewLanguage],
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-black/[0.04]"
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
              <div className="flex items-center gap-2">
                <LanguageOriginBadge
                  language={currentWord.translationLanguage}
                  size="sm"
                />

                <button
                  type="button"
                  onClick={() =>
                    speak(
                      currentWord.translation,
                      getLanguage(currentWord.translationLanguage).speechTag,
                    )
                  }
                  aria-label={insertValues(
                    t.vocabulary.detail.listenAriaLabel,
                    { text: currentWord.translation },
                  )}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line"
                >
                  <SpeakerIcon />
                </button>
              </div>
            </div>

            <p className="mt-4 text-[36px] font-bold tracking-[-0.02em]">
              {currentWord.translation}
            </p>

            {revealed && (
              <>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-5">
                  <p className="min-w-0 break-words text-2xl font-bold">
                    {currentWord.term}
                  </p>

                  <div className="flex shrink-0 items-center gap-2">
                    <LanguageOriginBadge
                      language={currentWord.termLanguage}
                      size="sm"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        speak(
                          currentWord.term,
                          getLanguage(currentWord.termLanguage).speechTag,
                        )
                      }
                      aria-label={insertValues(
                        t.vocabulary.detail.listenAriaLabel,
                        { text: currentWord.term },
                      )}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-line"
                    >
                      <SpeakerIcon />
                    </button>
                  </div>
                </div>

                {/*
                  Each example in the voice of the language it is written in,
                  read off the word rather than assumed. The two used to be
                  hard-coded en-US and zh-TW, so a French card's example was
                  read aloud in Mandarin.
                */}
                {(
                  [
                    [currentWord.termExample, currentWord.termLanguage],
                    [
                      currentWord.translationExample,
                      currentWord.translationLanguage,
                    ],
                  ] as const
                ).map(([example, language]) =>
                  example ? (
                    <div
                      key={language}
                      className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3"
                    >
                      <p className="min-w-0 text-sm leading-6">{example}</p>
                      <button
                        type="button"
                        onClick={() =>
                          speak(example, getLanguage(language).speechTag)
                        }
                        aria-label={insertValues(
                          t.vocabulary.detail.listenAriaLabel,
                          { text: example },
                        )}
                        className="shrink-0"
                      >
                        <SpeakerIcon />
                      </button>
                    </div>
                  ) : null,
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
          href={exitHref}
          transitionTypes={isCosmic ? [exitTransition] : undefined}
          className="mt-6 flex h-12 items-center justify-center gap-2 rounded-full bg-black px-6 text-sm font-semibold text-white"
        >
          {cameFromVocabulary ? copy.backToVocabulary : copy.backToHome}
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
          href={exitHref}
          transitionTypes={isCosmic ? [exitTransition] : undefined}
          aria-label={cameFromVocabulary ? copy.backToVocabulary : copy.backToHome}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-black/[0.04]"
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

        {/*
          Which language this session is in — shown only once there is more
          than one to choose between, because a control with a single option
          is a statement, not a choice.

          Chips rather than a sheet: there are at most five, the row is the
          first thing above the queue it governs, and seeing the counts side
          by side is the point.
        */}
        {languageCounts.size > 1 ? (
          <div
            className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label={t.vocabulary.language.filterAriaLabel}
          >
            {[null, ...languageCounts.keys()].map((code) => {
              const selected = reviewLanguage === code;
              const count = code
                ? (languageCounts.get(code) ?? 0)
                : allWords.length;

              return (
                <button
                  key={code ?? "all"}
                  type="button"
                  onClick={() => setReviewLanguage(code)}
                  aria-pressed={selected}
                  className={`flex h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition ${
                    selected
                      ? "border-black bg-black text-white"
                      : "border-line bg-white text-ink-soft"
                  }`}
                >
                  {code ? (
                    <LanguageOriginBadge
                      language={code}
                      size="sm"
                      className={
                        selected ? "!border-white/25 !bg-white/15" : ""
                      }
                    />
                  ) : null}

                  <span>
                    {code
                      ? getLanguage(code).endonym
                      : t.vocabulary.language.allLanguages}
                  </span>

                  <span
                    className={
                      selected ? "text-white/70" : "text-ink-faint"
                    }
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => startSession("due")}
          disabled={loading || dueInLanguage.length === 0}
          className="mt-6 block w-full rounded-[28px] bg-black p-6 text-left text-white transition active:scale-[0.99] disabled:opacity-50"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-invert-faint">
              {copy.today}
            </p>
            <p className="text-xs text-ink-invert-faint">{copy.introLineOne}</p>
          </div>

          <p className="mt-3 text-[40px] font-bold leading-none">
            {loading ? "…" : dueInLanguage.length}
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
            disabled={loading || allInLanguage.length === 0}
            className="mt-4 flex h-14 w-full items-center justify-between rounded-2xl bg-black px-5 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-50"
          >
            {copy.practiceAllWords}
            <span>{loading ? "…" : allInLanguage.length}</span>
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
                {loading ? "…" : dueInLanguage.length}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="text-ink-soft">{copy.freePractice}</span>
              <span className="font-bold">
                {loading ? "…" : allInLanguage.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Screen>
  );
}
