"use client";

import YumiFace from "@/components/pronunciation/YumiFace";
import useTranslation from "@/hooks/i18n/useTranslation";
import { fill } from "@/lib/i18n/format";
import { localize } from "@/lib/pronunciation/localizedText";
import {
  YUMI_IDLE_POSE,
  isVerdictState,
  type YumiAnimationState,
  type YumiRigPose,
} from "@/lib/pronunciation/yumiRig";
import type { PronunciationLanguagePack } from "@/lib/pronunciation/lab/types";

import YumiInstrument from "./YumiInstrument";

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
};

type CoachCopy = ReturnType<typeof useTranslation>["t"]["pronunciation"]["lab"]["coach"];

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
}: YumiCoachProps) {
  const { t, language } = useTranslation();
  const copy = t.pronunciation.lab.coach;

  const line = message ?? lineFor(state, copy);
  const instrumentName = localize(pack.yumiCalibration.label, language);

  const busy =
    state !== "idle" &&
    state !== "entering" &&
    state !== "exiting" &&
    !isVerdictState(state);

  const body = (
    <>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <YumiFace
          pose={pose ?? YUMI_IDLE_POSE}
          phase={state}
          size={size}
          label={t.pronunciation.yumi.demoAriaLabel}
          // Read from the pack, so no screen has to know which languages
          // need a stronger mouth.
          emphasisScale={pack.yumiCalibration.mouthEmphasis}
        />
        <YumiInstrument
          instrument={pack.yumiCalibration.instrument}
          active={busy}
        />
      </div>

      <div className="min-w-0 flex-1 text-center sm:text-left">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          {copy.eyebrow}
        </p>

        {/*
          Announced politely rather than assertively: this line changes on
          every playback and every verdict, and an assertive region would
          interrupt a screen reader mid-word each time.
        */}
        <p
          className="font-cjk mt-1 text-[15px] font-medium leading-6 text-ink-strong"
          aria-live="polite"
        >
          {line}
        </p>

        <p className="mt-1.5 text-xs text-ink-faint">
          {fill(copy.calibratedFor, { instrument: instrumentName })}
        </p>
      </div>
    </>
  );

  const shell = [
    "flex w-full flex-col items-center gap-4 rounded-[26px] p-5 text-center ring-1 transition-colors duration-300",
    "sm:flex-row sm:items-center sm:gap-5 sm:text-left",
    VERDICT_RING[state] ?? "bg-white ring-black/[0.06]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (!onTap) {
    return <div className={shell}>{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={tapLabel ?? t.pronunciation.yumi.tapToHear}
      className={`${shell} active:bg-black/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black`}
    >
      {body}
    </button>
  );
}
