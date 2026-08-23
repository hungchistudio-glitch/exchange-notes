"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AudioButton from "@/components/pronunciation/lab/AudioButton";
import usePronunciationPlayback from "@/hooks/pronunciation/usePronunciationPlayback";
import useTranslation from "@/hooks/i18n/useTranslation";
import { fill } from "@/lib/i18n/format";
import { getLanguage, type LanguageCode } from "@/lib/languages";
import { exampleAudio } from "@/lib/pronunciation/lab/audio";
import { localize } from "@/lib/pronunciation/localizedText";
import type {
  MinimalPairExample,
  MinimalPairSet,
} from "@/lib/pronunciation/lab/types";
import type { YumiAnimationState } from "@/lib/pronunciation/yumiRig";

export type DrillQuestion = {
  id: string;
  pairId: string;
  language: LanguageCode;
  options: MinimalPairExample[];
  /** Which option was actually played. */
  answerIndex: number;
};

/**
 * Turns a pack's minimal pairs into questions.
 *
 * Which side plays is genuinely random, and that is the one place in the
 * Lab where randomness is correct: a discrimination test the learner can
 * predict is not a test. Everything else — which pairs, in what order — is
 * deterministic so the drill is the same on a reload.
 */
export function buildDrillQuestions(
  pairs: MinimalPairSet[],
  limit = 10,
): DrillQuestion[] {
  const questions: DrillQuestion[] = [];

  for (const pair of pairs) {
    for (const [index, set] of pair.examples.entries()) {
      if (set.length < 2) continue;

      questions.push({
        id: `${pair.id}-${index}`,
        pairId: pair.id,
        language: pair.language,
        options: set,
        answerIndex: Math.floor(Math.random() * set.length),
      });

      if (questions.length >= limit) return questions;
    }
  }

  return questions;
}

type MinimalPairDrillProps = {
  questions: DrillQuestion[];
  onAnswer: (question: DrillQuestion, correct: boolean) => void;
  onFinish?: () => void;
  onCoachStateChange?: (state: YumiAnimationState) => void;
};

/**
 * Play one, choose which it was.
 *
 * The answer plays automatically when a question appears, because the point
 * of the exercise is hearing rather than reading — and it can be replayed
 * as many times as the learner wants, because a discrimination drill you
 * only get one shot at teaches frustration instead of the contrast.
 */
export default function MinimalPairDrill({
  questions,
  onAnswer,
  onFinish,
  onCoachStateChange,
}: MinimalPairDrillProps) {
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.pronunciation.lab.listen;

  const { phaseFor, play } = usePronunciationPlayback();

  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);

  const question = questions[index];

  const answerSource = useMemo(
    () =>
      question
        ? exampleAudio(question.options[question.answerIndex], question.language)
        : null,
    [question],
  );

  const playAnswer = useCallback(() => {
    if (!answerSource) return;
    play("answer", answerSource);
  }, [answerSource, play]);

  /*
   * Auto-plays each new question once.
   *
   * Deferred by a microtask because starting playback writes state, and an
   * effect body may not — same rule, same fix as everywhere else in the Lab.
   * Keyed on the question itself, so answering it does not replay it.
   */
  useEffect(() => {
    if (!question) return;
    queueMicrotask(playAnswer);
  }, [question, playAnswer]);

  useEffect(() => {
    if (!question) {
      onCoachStateChange?.("celebrating");
      return;
    }

    onCoachStateChange?.(
      chosen === null
        ? "listening"
        : chosen === question.answerIndex
          ? "correct"
          : "incorrect",
    );
  }, [chosen, question, onCoachStateChange]);

  if (!question) return null;

  const meta = getLanguage(question.language);
  const answered = chosen !== null;
  const correct = chosen === question.answerIndex;

  function choose(optionIndex: number) {
    if (answered) return;

    setChosen(optionIndex);
    onAnswer(question, optionIndex === question.answerIndex);
  }

  function advance() {
    setChosen(null);

    if (index + 1 >= questions.length) {
      onFinish?.();
      return;
    }

    setIndex(index + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {fill(copy.roundOf, { current: index + 1, total: questions.length })}
        </p>

        <AudioButton
          label={copy.playAgain}
          phase={phaseFor("answer")}
          onClick={playAnswer}
        />
      </div>

      <p className="font-cjk text-[17px] font-semibold">{copy.prompt}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {question.options.map((option, optionIndex) => {
          const isAnswer = optionIndex === question.answerIndex;
          const isChosen = optionIndex === chosen;

          const tone = !answered
            ? "border-line bg-white hover:bg-black/[0.02]"
            : isAnswer
              ? "border-emerald-300 bg-emerald-50"
              : isChosen
                ? "border-red-300 bg-red-50"
                : "border-line bg-white opacity-60";

          return (
            /*
              Choosing and replaying are two different actions, so they are
              two sibling buttons rather than one nested inside the other —
              a `<button>` inside a `<button>` is invalid, and the browser
              closes the outer one at the inner tag.
            */
            <div
              key={`${option.text}-${optionIndex}`}
              className={`flex min-h-[72px] items-center gap-2 rounded-2xl border pr-2 transition-colors ${tone}`}
            >
              <button
                type="button"
                onClick={() => choose(optionIndex)}
                disabled={answered}
                className="flex min-h-[72px] min-w-0 flex-1 items-center px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                <span className="min-w-0">
                  <span
                    className="font-cjk block truncate text-[17px] font-semibold"
                    style={{ fontFamily: `var(${meta.fontVariable})` }}
                    lang={meta.htmlLang}
                  >
                    {option.text}
                  </span>

                  {option.phonetic ? (
                    <span className="font-phonetic block truncate text-xs text-ink-faint">
                      {option.phonetic}
                    </span>
                  ) : null}

                  {answered && option.meaning ? (
                    <span className="font-cjk block truncate text-xs text-ink-faint">
                      {localize(option.meaning, interfaceLanguage)}
                    </span>
                  ) : null}
                </span>
              </button>

              {answered ? (
                <AudioButton
                  label={fill(t.pronunciation.cards.playWord, { word: option.text })}
                  size="sm"
                  phase={phaseFor(`option-${optionIndex}`)}
                  onClick={() =>
                    play(
                      `option-${optionIndex}`,
                      exampleAudio(option, question.language),
                    )
                  }
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {answered ? (
        <div className="space-y-3" aria-live="polite">
          <p
            className={`font-cjk text-[15px] font-semibold ${
              correct ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {correct
              ? copy.correct
              : fill(copy.incorrect, {
                  answer: question.options[question.answerIndex].text,
                })}
          </p>

          <button
            type="button"
            onClick={advance}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-black text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            {index + 1 >= questions.length ? copy.finish : copy.next}
          </button>
        </div>
      ) : null}
    </div>
  );
}
