"use client";

import { useCallback, useEffect, useState } from "react";

import LabScreen from "@/components/pronunciation/lab/LabScreen";
import MinimalPairDrill, {
  buildDrillQuestions,
  type DrillQuestion,
} from "@/components/pronunciation/lab/MinimalPairDrill";
import YumiCoach from "@/components/pronunciation/lab/YumiCoach";
import { LabEmpty, LabLoading } from "@/components/pronunciation/lab/StateViews";
import { usePronunciationLab } from "@/contexts/PronunciationLabContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import { findMinimalPair } from "@/lib/pronunciation/lab/registry";
import type { YumiAnimationState } from "@/lib/pronunciation/yumiRig";

export default function ListenModule() {
  const { t } = useTranslation();
  const copy = t.pronunciation.lab;

  const { pack, recordAttempt } = usePronunciationLab();

  /*
   * Built after mount, not during render.
   *
   * Which side of a pair plays has to be unpredictable, and a client
   * component still renders once on the server — calling Math.random in a
   * state initialiser would produce one answer in the HTML and a different
   * one in the browser, which React reports as a hydration mismatch.
   */
  const [questions, setQuestions] = useState<DrillQuestion[] | null>(null);
  const [finished, setFinished] = useState(false);
  const [coachState, setCoachState] = useState<YumiAnimationState>("idle");

  useEffect(() => {
    // Deferred by a microtask so the write does not cascade a second render
    // inside the effect body — it still lands before the browser paints.
    queueMicrotask(() => {
      setFinished(false);
      setQuestions(buildDrillQuestions(pack.minimalPairs));
    });
  }, [pack]);

  const handleAnswer = useCallback(
    (question: DrillQuestion, correct: boolean) => {
      const pair = findMinimalPair(pack, question.pairId);
      const unitId =
        question.options[question.answerIndex].unitId ?? pair?.targets[0];

      if (!unitId) return;

      void recordAttempt({
        unitId,
        module: "listen",
        outcome: correct ? "correct" : "incorrect",
        // A listening answer is right or wrong; it is not a percentage, so
        // none is recorded rather than one being manufactured from it.
        listeningScore: correct ? 100 : 0,
      });
    },
    [pack, recordAttempt],
  );

  const restart = useCallback(() => {
    setFinished(false);
    setQuestions(buildDrillQuestions(pack.minimalPairs));
  }, [pack]);

  return (
    <LabScreen
      title={copy.listen.title}
      eyebrow={pack.displayName}
      subtitle={copy.listen.subtitle}
      backHref="/pronunciation"
      backLabel={copy.backToLab}
    >
      <div className="space-y-5 pb-8">
        <YumiCoach pack={pack} state={coachState} size={92} />

        {questions === null ? (
          <LabLoading />
        ) : questions.length === 0 ? (
          <LabEmpty title={copy.listen.empty} />
        ) : finished ? (
          <div className="rounded-3xl border border-black/[0.06] bg-white p-6 text-center">
            <p className="text-[1.0625rem] font-semibold">{copy.session.complete}</p>
            <button
              type="button"
              onClick={restart}
              className="mt-4 inline-flex min-h-[48px] items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              {copy.session.startOver}
            </button>
          </div>
        ) : (
          <MinimalPairDrill
            questions={questions}
            onAnswer={handleAnswer}
            onFinish={() => setFinished(true)}
            onCoachStateChange={setCoachState}
          />
        )}
      </div>
    </LabScreen>
  );
}
