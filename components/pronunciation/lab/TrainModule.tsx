"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import AudioButton from "@/components/pronunciation/lab/AudioButton";
import LabScreen from "@/components/pronunciation/lab/LabScreen";
import MinimalPairDrill, {
  buildDrillQuestions,
  type DrillQuestion,
} from "@/components/pronunciation/lab/MinimalPairDrill";
import RhythmPhraseView from "@/components/pronunciation/lab/RhythmPhraseView";
import SpeakTrainer from "@/components/pronunciation/lab/SpeakTrainer";
import YumiCoach from "@/components/pronunciation/lab/YumiCoach";
import { LabEmpty, LabLoading } from "@/components/pronunciation/lab/StateViews";
import { usePronunciationLab } from "@/contexts/PronunciationLabContext";
import usePronunciationPlayback, {
  type PlaybackControls,
} from "@/hooks/pronunciation/usePronunciationPlayback";
import useTranslation from "@/hooks/i18n/useTranslation";
import { fill } from "@/lib/i18n/format";
import { exampleAudio, phraseAudio, unitAudio } from "@/lib/pronunciation/lab/audio";
import { buildDailyTraining } from "@/lib/pronunciation/lab/dailyTraining";
import { getDueUnits, lessonProgressKey } from "@/lib/pronunciation/lab/progress";
import { findLesson, findMinimalPair, findUnit } from "@/lib/pronunciation/lab/registry";
import { saveTrainingSession } from "@/lib/pronunciation/lab/repository";
import {
  clearSession,
  currentItem,
  isComplete,
  loadSession,
  saveSession,
  sessionReducer,
  startSession,
  summariseSession,
} from "@/lib/pronunciation/lab/session";
import { localize } from "@/lib/pronunciation/localizedText";
import { createClient } from "@/lib/supabase/client";
import type { YumiAnimationState } from "@/lib/pronunciation/yumiRig";
import type {
  PronunciationLanguagePack,
  PronunciationTrainingSession,
  TrainingItem,
  TrainingItemOutcome,
} from "@/lib/pronunciation/lab/types";
import type { AttemptRecord } from "@/lib/pronunciation/lab/repository";
import type { VocabularyPronunciationTarget } from "@/lib/pronunciation/lab/words";

type RecordAttempt = (
  attempt: Omit<AttemptRecord, "language">,
) => Promise<unknown>;

/**
 * One short session, item by item.
 *
 * The session is state, not a route: it lives in one object, is mirrored to
 * sessionStorage after every change, and is restored on mount — so a
 * refresh, an accidental back gesture or a phone call resumes rather than
 * restarts. A stored session belonging to a different language is discarded
 * instead of resumed; see loadSession.
 */
export default function TrainModule() {
  const { t } = useTranslation();
  const copy = t.pronunciation.lab;

  const searchParams = useSearchParams();
  const fromReview = searchParams.get("source") === "review";

  const { pack, progress, words, recordAttempt } = usePronunciationLab();
  const playback = usePronunciationPlayback();
  const { stop: stopPlayback } = playback;

  const [session, setSession] = useState<PronunciationTrainingSession | null>(
    null,
  );
  const [coachState, setCoachState] = useState<YumiAnimationState>("idle");

  /*
   * Built once, when the session starts.
   *
   * Deliberately not recomputed as progress changes: answering an item
   * updates the weakness map, and a plan derived live from it would swap
   * the remaining items out from under the learner mid-session.
   */
  const buildItems = useCallback((): TrainingItem[] => {
    if (fromReview) {
      return getDueUnits(pack, progress)
        .slice(0, 6)
        .map((unit) => ({
          id: `review:${unit.id}`,
          kind: "sound" as const,
          targetId: unit.id,
          module: "review" as const,
          label: unit.symbol,
          estimatedSeconds: 45,
        }));
    }

    return buildDailyTraining({ pack, progress, words }).items;
    // Captured at mount by the effect below, which is the only caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromReview, pack]);

  useEffect(() => {
    const stored = loadSession(pack.language);
    const next = stored ?? startSession(pack.language, buildItems());

    // Deferred out of the effect body so the write does not cascade a
    // render inside it; a microtask still lands before the first paint.
    queueMicrotask(() => setSession(next));
  }, [pack.language, buildItems]);

  /*
   * One place owns the stored copy.
   *
   * The mirror exists to survive a refresh mid-session, so a finished
   * session is removed rather than written — and doing both here, rather
   * than clearing from the completion effect below, avoids the ordering
   * where the clear runs first and the completed session is written back
   * over it on the next render.
   */
  useEffect(() => {
    if (!session) return;

    if (session.completedAt) clearSession();
    else saveSession(session);
  }, [session]);

  const finished = session ? isComplete(session) : false;

  useEffect(() => {
    if (!session || !finished || session.completedAt) return;

    const completed = sessionReducer(session, { type: "complete" });

    queueMicrotask(() => setSession(completed));
    void saveTrainingSession(createClient(), completed);
  }, [finished, session]);

  const answer = useCallback(
    (outcome: TrainingItemOutcome, score?: number) => {
      stopPlayback();
      setCoachState("idle");
      setSession((current) =>
        current
          ? sessionReducer(current, { type: "answer", outcome, score })
          : current,
      );
    },
    [stopPlayback],
  );

  const skip = useCallback(() => {
    stopPlayback();
    setCoachState("idle");
    setSession((current) =>
      current ? sessionReducer(current, { type: "skip" }) : current,
    );
  }, [stopPlayback]);

  if (!session) {
    return (
      <LabScreen
        title={copy.today.title}
        backHref="/pronunciation"
        backLabel={copy.backToLab}
      >
        <LabLoading />
      </LabScreen>
    );
  }

  if (session.items.length === 0) {
    return (
      <LabScreen
        title={copy.today.title}
        backHref="/pronunciation"
        backLabel={copy.backToLab}
      >
        <LabEmpty title={copy.today.empty} />
      </LabScreen>
    );
  }

  if (finished) {
    const summary = summariseSession(session);

    return (
      <LabScreen
        title={copy.session.complete}
        backHref="/pronunciation"
        backLabel={copy.backToLab}
      >
        <div className="space-y-5 pb-8">
          <YumiCoach pack={pack} state="celebrating" size={92} />

          <section className="rounded-[26px] border border-black/[0.06] bg-white p-6 text-center">
            <p className="font-cjk text-[17px] font-semibold">
              {fill(copy.session.completeBody, {
                correct: summary.correct,
                answered: summary.answered,
              })}
            </p>

            {summary.averageScore === null ? (
              <p className="mt-2 text-sm text-ink-faint">{copy.speak.notAnalyzed}</p>
            ) : (
              <p className="mt-2 text-[28px] font-bold tracking-[-0.02em]">
                {summary.averageScore}
              </p>
            )}

            <Link
              href="/pronunciation"
              className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-black text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              {copy.session.backToLab}
            </Link>
          </section>
        </div>
      </LabScreen>
    );
  }

  const item = currentItem(session);
  if (!item) return null;

  return (
    <LabScreen
      title={copy.today.title}
      eyebrow={pack.displayName}
      backHref="/pronunciation"
      backLabel={copy.backToLab}
      action={
        <span className="text-xs font-semibold text-ink-faint">
          {fill(copy.session.stepOf, {
            current: session.index + 1,
            total: session.items.length,
          })}
        </span>
      }
    >
      <div className="space-y-5 pb-8">
        <div
          className="h-1 overflow-hidden rounded-full bg-black/[0.07]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={session.items.length}
          aria-valuenow={session.index}
          aria-label={copy.session.stepOf}
        >
          <span
            className="block h-full rounded-full bg-black transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${(session.index / session.items.length) * 100}%` }}
          />
        </div>

        <YumiCoach pack={pack} state={coachState} size={92} />

        {/*
          Keyed by item id so moving to the next step tears the previous one
          down. Without it a SpeakTrainer would be reused across items and
          carry the last word's recording and score into the next one.
        */}
        <TrainingStep
          key={item.id}
          item={item}
          pack={pack}
          words={words}
          playback={playback}
          recordAttempt={recordAttempt}
          onAnswer={answer}
          onCoachStateChange={setCoachState}
        />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={skip}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-full border border-line bg-white text-sm font-semibold text-ink-soft transition-colors hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            {copy.session.skip}
          </button>

          <button
            type="button"
            onClick={() => answer("correct")}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-full bg-black text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            {session.index + 1 >= session.items.length
              ? copy.session.finish
              : copy.session.next}
          </button>
        </div>
      </div>
    </LabScreen>
  );
}

/* =========================================================
   Steps

   Module-scope components, not closures inside TrainModule. A component
   defined inside a render is a new type on every render, and React
   unmounts and remounts the whole subtree when the type changes — which
   for a step containing a live recorder means losing the recording every
   time the session state ticks.
   ========================================================= */

type StepProps = {
  item: TrainingItem;
  pack: PronunciationLanguagePack;
  words: VocabularyPronunciationTarget[];
  playback: PlaybackControls;
  recordAttempt: RecordAttempt;
  onAnswer: (outcome: TrainingItemOutcome, score?: number) => void;
  onCoachStateChange: (state: YumiAnimationState) => void;
};

function TrainingStep(props: StepProps) {
  switch (props.item.kind) {
    case "sound":
      return <SoundStep {...props} />;
    case "minimal-pair":
      return <PairStep {...props} />;
    case "word":
      return <WordStep {...props} />;
    case "rhythm":
      return <RhythmStep {...props} />;
    case "speak":
      return <SpeakStep {...props} />;
  }
}

function SoundStep({ item, pack, playback, onCoachStateChange }: StepProps) {
  const { t } = useTranslation();
  const copy = t.pronunciation.lab;

  const unit = findUnit(pack, item.targetId);
  if (!unit) return <LabEmpty title={copy.detail.notFound} />;

  const source = unitAudio(unit);

  return (
    <section className="rounded-[26px] border border-black/[0.06] bg-white p-6 text-center">
      <p className="text-[44px] font-bold leading-none tracking-[-0.02em]">
        {unit.symbol}
      </p>

      {unit.phoneticRepresentation ? (
        <p className="font-phonetic mt-2 text-sm text-ink-faint">
          {unit.phoneticRepresentation}
        </p>
      ) : null}

      <div className="mt-5 flex justify-center gap-2">
        <AudioButton
          label={copy.detail.nativeSpeed}
          failedLabel={t.pronunciation.cards.playbackFailed}
          phase={playback.phaseFor(unit.id)}
          onClick={() => {
            onCoachStateChange("articulating");
            playback.play(unit.id, source);
          }}
        />

        <button
          type="button"
          onClick={() => playback.play(`${unit.id}-slow`, source, "slow")}
          className="inline-flex min-h-[44px] items-center rounded-full border border-line bg-white px-4 text-[13px] font-semibold text-ink-soft transition-colors hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          {copy.detail.slowSpeed}
        </button>
      </div>

      <Link
        href={`/pronunciation/sounds/${encodeURIComponent(unit.id)}`}
        className="mt-4 inline-block text-[13px] font-semibold text-ink-soft underline underline-offset-4 hover:text-black"
      >
        {copy.detail.articulation}
      </Link>
    </section>
  );
}

function PairStep({
  item,
  pack,
  recordAttempt,
  onAnswer,
  onCoachStateChange,
}: StepProps) {
  const { t } = useTranslation();
  const copy = t.pronunciation.lab;

  const pair = useMemo(
    () => findMinimalPair(pack, item.targetId),
    [pack, item.targetId],
  );

  // Built after mount for the same reason ListenModule builds its own that
  // way: which side plays is random, and random during render is a
  // hydration mismatch.
  const [questions, setQuestions] = useState<DrillQuestion[] | null>(null);
  const [wrong, setWrong] = useState(0);

  useEffect(() => {
    const next = pair ? buildDrillQuestions([pair], 3) : [];
    queueMicrotask(() => setQuestions(next));
  }, [pair]);

  if (!pair) return <LabEmpty title={copy.listen.empty} />;
  if (questions === null) return <LabLoading />;
  if (questions.length === 0) return <LabEmpty title={copy.listen.empty} />;

  return (
    <MinimalPairDrill
      questions={questions}
      onCoachStateChange={onCoachStateChange}
      onAnswer={(question, correct) => {
        if (!correct) setWrong((count) => count + 1);

        void recordAttempt({
          unitId: question.options[question.answerIndex].unitId,
          module: "listen",
          outcome: correct ? "correct" : "incorrect",
          listeningScore: correct ? 100 : 0,
        });
      }}
      onFinish={() =>
        onAnswer(wrong === 0 ? "correct" : wrong === 1 ? "almost" : "incorrect")
      }
    />
  );
}

function WordStep({
  item,
  pack,
  words,
  recordAttempt,
  onCoachStateChange,
}: StepProps) {
  const { t } = useTranslation();
  const word = words.find((candidate) => candidate.itemId === item.targetId);

  if (!word) return <LabEmpty title={t.pronunciation.lab.words.empty} />;

  return (
    <SpeakTrainer
      language={pack.language}
      targetText={word.text}
      nativeSource={{ kind: "speech", text: word.text, language: pack.language }}
      dimensions={pack.scoreDimensions}
      onCoachStateChange={onCoachStateChange}
      onAttempt={(outcome, score, analyzer) => {
        for (const unitId of word.unitIds) {
          void recordAttempt({
            unitId,
            module: "words",
            outcome,
            score,
            analyzer,
            speakingScore: score,
          });
        }
      }}
    />
  );
}

function RhythmStep({
  item,
  pack,
  playback,
  recordAttempt,
  onCoachStateChange,
}: StepProps) {
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.pronunciation.lab;

  const lesson = findLesson(pack, item.targetId);
  if (!lesson) return <LabEmpty title={copy.rhythm.empty} />;

  return (
    <section className="rounded-[26px] border border-black/[0.06] bg-white p-5">
      <h2 className="font-cjk text-lg font-bold tracking-[-0.02em]">
        {localize(lesson.title, interfaceLanguage)}
      </h2>

      {lesson.rule ? (
        <p className="font-cjk mt-2 text-sm leading-6 text-ink-soft">
          {localize(lesson.rule, interfaceLanguage)}
        </p>
      ) : null}

      <ul className="mt-4 space-y-4">
        {lesson.phrases.slice(0, 3).map((phrase) => (
          <li key={phrase.id}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-cjk min-w-0 truncate text-[15px] font-semibold">
                {phrase.text}
              </p>

              <AudioButton
                label={phrase.text}
                failedLabel={t.pronunciation.cards.playbackFailed}
                phase={playback.phaseFor(phrase.id)}
                onClick={() => {
                  onCoachStateChange("demonstrating");
                  playback.play(phrase.id, phraseAudio(phrase, lesson.language));
                  void recordAttempt({
                    unitId: lessonProgressKey(lesson.id),
                    module: "rhythm",
                    outcome: "correct",
                  });
                }}
              />
            </div>

            <div className="mt-2">
              <RhythmPhraseView phrase={phrase} language={lesson.language} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SpeakStep({ item, pack, recordAttempt, onCoachStateChange }: StepProps) {
  const { t } = useTranslation();

  const unit = findUnit(pack, item.targetId);
  if (!unit) return <LabEmpty title={t.pronunciation.lab.detail.notFound} />;

  return (
    <SpeakTrainer
      language={unit.language}
      targetText={unit.examples[0]?.text ?? unit.speechText ?? unit.symbol}
      nativeSource={
        unit.examples[0]
          ? exampleAudio(unit.examples[0], unit.language)
          : unitAudio(unit)
      }
      dimensions={pack.scoreDimensions}
      onCoachStateChange={onCoachStateChange}
      onAttempt={(outcome, score, analyzer) =>
        void recordAttempt({
          unitId: unit.id,
          module: "speak",
          outcome,
          score,
          analyzer,
          speakingScore: score,
        })
      }
    />
  );
}
