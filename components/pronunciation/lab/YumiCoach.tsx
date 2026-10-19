"use client";

import { useState } from "react";

import YumiFace from "@/components/pronunciation/YumiFace";
import useTranslation from "@/hooks/i18n/useTranslation";
import useArticulation from "@/hooks/pronunciation/useArticulation";
import { fill } from "@/lib/i18n/format";
import { describeMoment, type MomentDescription } from "@/lib/pronunciation/articulationNotes";
import type { ArticulationTimeline } from "@/lib/pronunciation/articulationTimeline";
import { localize } from "@/lib/pronunciation/localizedText";
import {
  YUMI_IDLE_POSE,
  type YumiAnimationState,
  type YumiRigPose,
} from "@/lib/pronunciation/yumiRig";
import type { PronunciationLanguagePack } from "@/lib/pronunciation/lab/types";

import PronunciationTrace from "./PronunciationTrace";

type YumiCoachProps = {
  pack: PronunciationLanguagePack;
  state: YumiAnimationState;
  /** The sound being demonstrated. Idle pose when there is none. */
  pose?: YumiRigPose;
  size?: number;
  /** Overrides the state's own line — for a specific bit of coaching. */
  message?: string;
  /** Makes the whole coach one tap target. Omit for a display-only Yumi. */
  onTap?: () => void;
  tapLabel?: string;
  className?: string;
  /** The pronunciation trace under her. Off on screens that play nothing. */
  trace?: boolean;
};

type CoachCopy = ReturnType<typeof useTranslation>["t"]["pronunciation"]["lab"]["coach"];
type TimelineCopy = ReturnType<typeof useTranslation>["t"]["pronunciation"]["lab"]["timeline"];

/**
 * Which line Yumi says, from what she is doing.
 *
 * Grouped rather than one-to-one: "preparing", "articulating" and
 * "releasing" are three moments of the same act from the rig's point of
 * view and one sentence from the learner's. Exhaustive, so a new state
 * cannot quietly fall through to silence.
 */
function lineFor(state: YumiAnimationState, copy: CoachCopy): string {
  switch (state) {
    case "idle":
    case "entering":
    case "exiting":
      return copy.idle;
    case "preparing":
    case "demonstrating":
    case "articulating":
    case "holding":
    case "releasing":
    case "speaking":
    case "completed":
      return copy.demonstrating;
    case "listening":
      return copy.listening;
    case "waiting":
      return copy.waiting;
    case "recording":
      return copy.recording;
    case "analyzing":
    case "thinking":
    case "comparing":
    case "calibrating":
      return copy.analyzing;
    case "correct":
      return copy.correct;
    case "almost":
      return copy.almost;
    case "incorrect":
    case "error":
      return copy.incorrect;
    case "celebrating":
      return copy.celebrating;
    case "encouraging":
      return copy.encouraging;
  }
}

const VERDICT_RING: Partial<Record<YumiAnimationState, string>> = {
  correct: "ring-emerald-300/70 bg-emerald-50/60",
  celebrating: "ring-emerald-300/70 bg-emerald-50/60",
  almost: "ring-amber-300/70 bg-amber-50/60",
  encouraging: "ring-amber-300/70 bg-amber-50/60",
  incorrect: "ring-red-200/70 bg-red-50/50",
  error: "ring-red-200/70 bg-red-50/50",
};

/**
 * One moment of a word, in words: the sound, what is happening, where in
 * the mouth, and what to watch (lib/pronunciation/articulationNotes.ts).
 */
function MomentCaption({
  moment,
  syllable,
  copy,
  announce,
}: {
  moment: MomentDescription;
  /** The zhuyin syllable the sound is in, for Mandarin. */
  syllable?: string;
  copy: TimelineCopy;
  announce: boolean;
}) {
  const title =
    moment.kind === "shape" && moment.shape
      ? `${copy.shapes[moment.shape]} · ${copy.stages.shape}`
      : copy.stages[moment.kind];
  const where = moment.place
    ? copy.places[moment.place]
    : moment.vowel
      ? `${copy.vowel[moment.vowel.height]} · ${copy.vowel[moment.vowel.backness]}`
      : null;

  return (
    <div
      className="mt-1"
      /* Read out when a moment is chosen, not sixty times a word. */
      aria-live={announce ? "polite" : "off"}
      data-moment={moment.kind}
    >
      <p className="flex flex-wrap items-baseline justify-center gap-x-2 sm:justify-start">
        {moment.symbol ? (
          <span className="font-phonetic text-xl font-semibold text-ink-strong">
            {syllable ? `${syllable} ` : ""}/{moment.symbol}/
          </span>
        ) : null}
        <span className="font-cjk text-[0.9375rem] font-medium text-ink-strong">{title}</span>
      </p>
      {where ? <p className="font-cjk mt-0.5 text-xs text-ink-soft">{where}</p> : null}
      {moment.notes.length ? (
        <ul className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
          {moment.notes.map((note) => (
            <li
              key={note}
              className="font-cjk rounded-full bg-[#c9962e]/[0.12] px-2.5 py-1 text-[0.75rem] leading-4 text-ink-strong"
            >
              {copy.notes[note]}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** The moments worth stepping through: everything but the pauses. */
function studyMoments(timeline: ArticulationTimeline): number[] {
  return timeline.steps.flatMap((step, index) => (step.kind === "pause" ? [] : [index]));
}

/**
 * Yumi, doing her job.
 *
 * The mascot became an instrument here: she demonstrates the articulation
 * with her own mouth, wears the measuring apparatus this language needs,
 * and says one short line about what is happening. Every module screen
 * mounts exactly one of these, which is also the rule that keeps the page
 * from turning into a wall of animated faces.
 */
export default function YumiCoach({
  pack,
  state,
  pose,
  size = 108,
  message,
  onTap,
  tapLabel,
  className = "",
  trace: showTrace = true,
}: YumiCoachProps) {
  const { t, language } = useTranslation();
  const copy = t.pronunciation.lab.coach;
  const timelineCopy = t.pronunciation.lab.timeline;

  /*
   * What Yumi is saying, moment by moment (hooks/pronunciation/useArticulation).
   * While it plays she follows it; afterwards a reader can stop on any
   * sound and step through its moments, slowly, as long as they like.
   */
  const articulation = useArticulation();
  const timeline = articulation.timeline;
  const [chosen, setChosen] = useState<{ id: number | null; step: number } | null>(null);

  /* A new playback clears what was chosen in the last one. */
  const studying =
    chosen && chosen.id === articulation.id && !articulation.playing ? chosen.step : null;
  const momentIndex = articulation.playing ? articulation.step : studying;
  const moment = timeline && momentIndex !== null ? timeline.steps[momentIndex] : undefined;
  const description = timeline && moment ? describeMoment(timeline, moment, pack.language) : null;
  const tonal = Boolean(timeline?.utterance.syllables.some((syllable) => syllable.tone !== undefined));
  const syllableText =
    tonal && moment && moment.syllable >= 0
      ? timeline?.utterance.syllables[moment.syllable]?.text
      : undefined;

  const moments = timeline ? studyMoments(timeline) : [];
  const position = studying !== null ? moments.indexOf(studying) : -1;

  const choose = (step: number | undefined) => {
    if (step === undefined || !timeline) return;
    setChosen({ id: articulation.id, step });
  };

  const choosePhone = (phone: number) => {
    if (!timeline) return;
    choose(timeline.steps.findIndex((step) => step.phone === phone));
  };

  const line = message ?? lineFor(state, copy);
  const instrumentName = localize(pack.yumiCalibration.label, language);

  const facePose = moment ? moment.pose : (pose ?? YUMI_IDLE_POSE);
  const facePhase: YumiAnimationState = moment
    ? moment.kind === "pause"
      ? "speaking"
      : "articulating"
    : state;

  const face = (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <YumiFace
        pose={facePose}
        phase={facePhase}
        size={size}
        label={t.pronunciation.yumi.demoAriaLabel}
        // Read from the pack, so no screen has to know which languages
        // need a stronger mouth.
        emphasisScale={pack.yumiCalibration.mouthEmphasis}
        stage={moment?.kind}
        stageMs={moment ? (articulation.playing ? moment.duration : 220) : undefined}
        stageKey={momentIndex !== null ? `${articulation.id}-${momentIndex}` : undefined}
      />
    </div>
  );

  const words = (
    <div className="min-w-0 flex-1 text-center sm:text-left">
      <p className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-ink-faint">
        {copy.eyebrow}
      </p>

      {description ? (
        <MomentCaption
          moment={description}
          syllable={syllableText}
          copy={timelineCopy}
          announce={!articulation.playing}
        />
      ) : (
        /*
          Announced politely rather than assertively: this line changes on
          every playback and every verdict, and an assertive region would
          interrupt a screen reader mid-word each time.
        */
        <p
          className="font-cjk mt-1 text-[0.9375rem] font-medium leading-6 text-ink-strong"
          aria-live="polite"
        >
          {line}
        </p>
      )}

      <p className="mt-1.5 text-xs text-ink-faint">
        {fill(copy.calibratedFor, { instrument: instrumentName })}
      </p>
    </div>
  );

  /*
   * The trace: the word as it is said, under her (PronunciationTrace).
   * Outside the tap target on purpose — its sounds are buttons of their own.
   */
  const trace = (
    <section aria-label={timelineCopy.title} className="w-full border-t border-black/[0.06] pt-3">
      <p className="text-center text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-ink-faint sm:text-left">
        {timelineCopy.title}
      </p>

      {timeline ? (
        <>
          <div className="mt-1">
            <PronunciationTrace
              timeline={timeline}
              instrument={pack.yumiCalibration.instrument}
              active={momentIndex}
              playing={articulation.playing}
              offset={articulation.offset}
              playbackKey={articulation.id}
              focus={articulation.focus}
              onSelectPhone={choosePhone}
              label={timelineCopy.title}
              phoneLabel={(symbol) => `/${symbol}/`}
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => choose(moments[position <= 0 ? 0 : position - 1])}
              disabled={articulation.playing || moments.length === 0}
              aria-label={timelineCopy.previous}
              className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-line bg-white px-3 text-sm font-semibold text-ink-soft transition-opacity hover:text-black disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
            >
              ‹
            </button>
            <p className="font-cjk min-w-0 flex-1 text-center text-[0.6875rem] text-ink-faint">
              {position >= 0
                ? fill(timelineCopy.position, { current: position + 1, total: moments.length })
                : articulation.focus.size
                  ? `${timelineCopy.tapHint} · ${timelineCopy.focus}`
                  : timelineCopy.tapHint}
            </p>
            <button
              type="button"
              onClick={() =>
                choose(moments[position < 0 ? 0 : Math.min(moments.length - 1, position + 1)])
              }
              disabled={articulation.playing || moments.length === 0}
              aria-label={timelineCopy.next}
              className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-line bg-white px-3 text-sm font-semibold text-ink-soft transition-opacity hover:text-black disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
            >
              ›
            </button>
          </div>

          <p className="font-cjk mt-2 text-center text-[0.6875rem] text-ink-faint sm:text-left">
            {timelineCopy.estimated}
          </p>
        </>
      ) : (
        <p className="font-cjk mt-2 text-center text-xs text-ink-faint sm:text-left">
          {timelineCopy.empty}
        </p>
      )}
    </section>
  );

  const shell = [
    "flex w-full flex-col items-center gap-4 rounded-[26px] p-5 text-center ring-1 transition-colors duration-300",
    VERDICT_RING[state] ?? "bg-white ring-black/[0.06]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const row = "flex w-full flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5 sm:text-left";

  return (
    <div className={shell}>
      {onTap ? (
        <button
          type="button"
          onClick={onTap}
          aria-label={tapLabel ?? t.pronunciation.yumi.tapToHear}
          className={`${row} rounded-[20px] active:bg-black/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black`}
        >
          {face}
          {words}
        </button>
      ) : (
        <div className={row}>
          {face}
          {words}
        </div>
      )}
      {showTrace ? trace : null}
    </div>
  );
}
