"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";

import {
  YUMI_IDLE_POSE,
  type AirflowRig,
  type YumiAnimationState,
  type YumiRigPose,
} from "@/lib/pronunciation/yumiRig";

import styles from "./YumiFace.module.css";

type YumiFaceProps = {
  pose: YumiRigPose;
  phase: YumiAnimationState;
  size?: number;
  label?: string;
  /** How far the mouth shape overshoots away from its resting position while
   * actively teaching — see TEACHING_EMPHASIS below. Defaults to the
   * standard amount; the Zhuyin page passes a higher value since most
   * Zhuyin initials sit fairly close to the resting jaw/lip position to
   * begin with (their contrast is mostly in tongue placement, not mouth
   * shape), so the same default emphasis read as barely-there movement. */
  emphasisScale?: number;
};

// States that should show the sound's TARGET mouth/tongue shape. Everything
// else (idle, completed, error) rests on the neutral pose — the speaker
// button's own icon (check/retry) carries "done"/"error" meaning, the rig
// doesn't need to.
const ACTIVE_PHASES: YumiAnimationState[] = [
  "preparing",
  "articulating",
  "holding",
  "releasing",
  "recording",
  "comparing",
];

// Phases where the tongue is actually pressed against its target, not just
// moving toward or away from it — worth a small contact flash.
const CONTACT_PHASES: YumiAnimationState[] = ["holding", "articulating"];

// Phases where air is actually moving, for the airflow streak effect —
// slightly wider than CONTACT_PHASES since airflow (unlike a discrete
// tongue contact) continues through the release too (a stop's burst IS the
// release; a fricative's hiss continues right up to it).
const AIRFLOW_PHASES: YumiAnimationState[] = ["articulating", "holding", "releasing"];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    queueMicrotask(() => setReduced(query.matches));

    const handler = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  return reduced;
}

// ── Mouth ──────────────────────────────────────────────────────────────
// A single lip shape drawn on the mark's own face, reacting to jawOpen /
// lipRoundness / lipSpread / lipClosure — see the scope note further down
// for why this replaced the old separate mouth-cavity diagram.
const MOUTH_TOP_Y = 228;
const MOUTH_CENTER_X = 195;

// Teaching-emphasis brief: Yumi's mouth shouldn't just show the raw target
// pose — it should exaggerate HOW FAR that pose sits from a relaxed resting
// mouth, so open/round/closed/spread shapes read as obviously different at
// a glance instead of requiring a close look. Only applied while actively
// teaching a sound (isActive) — pushing a value further from IDLE by this
// factor and clamping to [0,1]. When the target *is* idle (nothing playing)
// this is a no-op, since there's nothing to amplify away from.
const DEFAULT_TEACHING_EMPHASIS = 1.35;

function emphasize(target: number, resting: number, active: boolean, scale: number): number {
  if (!active) return target;
  const amplified = resting + (target - resting) * scale;
  return Math.min(1, Math.max(0, amplified));
}

function mouthGeometry(mouth: YumiRigPose["mouth"], active: boolean, scale: number) {
  const idle = YUMI_IDLE_POSE.mouth;
  const jawOpen = emphasize(mouth.jawOpen, idle.jawOpen, active, scale);
  const lipRoundness = emphasize(mouth.lipRoundness, idle.lipRoundness, active, scale);
  const lipSpread = emphasize(mouth.lipSpread, idle.lipSpread, active, scale);
  const lipClosure = emphasize(mouth.lipClosure, idle.lipClosure, active, scale);

  const openHeight = 8 + jawOpen * 44;
  const closedHeight = 7;
  const height = openHeight * (1 - lipClosure) + closedHeight * lipClosure;
  // Rounding narrows the mouth (a pursed "o"/"u" shape); spread widens it
  // (a flatter, corners-pulled "s"/"i" shape) — previously lipSpread was
  // computed in the rig but never actually drawn, so every unrounded sound
  // looked the same width regardless of how spread its lips should be.
  const width = 68 - lipRoundness * 34 + lipSpread * 22;

  return {
    cx: MOUTH_CENTER_X,
    cy: MOUTH_TOP_Y + height / 2,
    rx: Math.max(width / 2, 10),
    ry: Math.max(height / 2, 3),
  };
}

// How snappy the mouth's transition into its target shape should feel,
// keyed off the sound's airflow path (already derived per-sound in
// yumiRig.ts) rather than a separate manner prop: a burst (stop consonant)
// should snap shut/open crisply, a sustained vowel should ease in more
// steadily, matching brief section 3 ("爆破音...更鮮明" / "母音...更穩定").
const MOUTH_SPEED_MS: Record<AirflowRig["path"], number> = {
  burst: 150,
  friction: 220,
  nasal: 260,
  oral_center: 340,
  oral_side: 340,
};

// ── Tongue — the mark's own middle bar ───────────────────────────────────
// The "E" mark (see components/ui/ExchangeNotesMark.tsx) is drawn as three
// thick rounded strokes meeting at one joint: a top arm, a bottom arm, and
// a short middle bar sticking out toward the eye. The top/bottom arms are
// reproduced below unchanged — they're the character's identity and stay
// static. The middle bar is the one piece that moves: instead of sitting
// fixed at its original endpoint, it now pivots from that same joint and
// sweeps toward wherever the active sound's tongue actually goes, so Yumi
// is quite literally showing tongue placement with her own body instead of
// a separate diagram next to it. The mark's vertical space doubles as the
// mouth-cavity metaphor while it does: the top arm reads as the roof of
// the mouth, the bottom arm as the floor, so a high tongue (t, s, l...)
// swings the bar up toward the top arm, and a low tongue (most open vowels)
// swings it down toward the bottom one.
//
// This replaced an earlier separate mouth-cavity cross-section diagram
// (a palate line, a 5-point tongue path, airflow particles, a standalone
// contact dot) that lived next to Yumi rather than on her — it read as a
// disconnected technical illustration rather than Yumi actually teaching.
// Airflow got its own small visual back (see airflowOrigin/AIRFLOW_LINES
// below) once the "visual teaching stage" brief asked for it specifically —
// this version lives right at Yumi's own mouth instead of a separate
// diagram, so it reads as part of her rather than bolted on.
const TONGUE_PIVOT = { x: 100, y: 180 };
const TONGUE_TIP_X: [number, number] = [130, 290];
const TONGUE_TIP_Y: [number, number] = [140, 220];

type TonguePointKey = "tip" | "blade" | "middle" | "back" | "root";

function tongueTip(pose: YumiRigPose) {
  const region = pose.tongue.activeRegion;
  // TongueRig only has points for tip/blade/middle/back/root — "front" and
  // "neutral" are valid *descriptive* regions but not points of their own.
  // "front" (palatal sounds like y) maps onto blade, the part of the
  // tongue that actually approaches the hard palate; "neutral" (sounds
  // where the tongue isn't the primary articulator, e.g. p/f/h) has no
  // single point to reach for, so the bar rests at a relaxed mid position.
  const key: TonguePointKey | null =
    region === "neutral" ? null : region === "front" ? "blade" : (region as TonguePointKey);
  const point = key ? pose.tongue[key] : { x: 0.5, y: 0.5 };

  const [xMin, xMax] = TONGUE_TIP_X;
  const [yMin, yMax] = TONGUE_TIP_Y;

  return {
    x: xMin + point.x * (xMax - xMin),
    y: yMin + point.y * (yMax - yMin),
  };
}

// ── Airflow ────────────────────────────────────────────────────────────
// A small cluster of streak lines near where air actually exits — the
// mouth for every path except "nasal", which exits up toward where a nose
// would be instead. Styling (burst vs. sustained-friction vs. nasal) comes
// from CSS classes keyed by `path` (see YumiFace.module.css); intensity
// (already derived per-sound — aspirated stops get 0.9, plain airflow gets
// ~0.55, vowels ~0.25) scales opacity here so an aspirated ㄆ visibly puffs
// harder than an unaspirated ㄅ without needing a second animation set.
function airflowOrigin(mouth: { cx: number; cy: number; rx: number }) {
  return { x: mouth.cx + mouth.rx - 4, y: mouth.cy };
}

const NASAL_ORIGIN = { x: MOUTH_CENTER_X + 14, y: MOUTH_TOP_Y - 60 };

export default function YumiFace({
  pose,
  phase,
  size = 72,
  label,
  emphasisScale = DEFAULT_TEACHING_EMPHASIS,
}: YumiFaceProps) {
  const reducedMotion = useReducedMotion();
  const isActive = ACTIVE_PHASES.includes(phase);
  const activePose = isActive ? pose : YUMI_IDLE_POSE;
  const rawId = useId();
  const eyeClipId = `yumi-face-eye-${rawId.replace(/:/g, "")}`;

  const mouth = mouthGeometry(activePose.mouth, isActive, emphasisScale);
  const tip = tongueTip(activePose);
  const showVoicing = activePose.voicing.voiced && isActive;
  const showContact = activePose.contact.zone !== "none" && CONTACT_PHASES.includes(phase);
  const mouthSpeedMs = isActive ? MOUTH_SPEED_MS[activePose.airflow.path] : 320;
  const showAirflow = isActive && activePose.airflow.enabled && AIRFLOW_PHASES.includes(phase);
  const airflowPath = activePose.airflow.path;
  const airflowOriginPoint = airflowPath === "nasal" ? NASAL_ORIGIN : airflowOrigin(mouth);

  const breathing = !reducedMotion && (phase === "idle" || phase === "entering");

  return (
    <div
      className={`${styles.stage} ${reducedMotion ? styles.reduced : ""} ${
        breathing ? styles.breathing : ""
      } ${phase === "entering" ? styles.entering : ""} ${
        phase === "exiting" ? styles.exiting : ""
      } ${isActive ? styles.focusing : ""}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg viewBox="0 0 400 400" width="100%" height="100%" aria-hidden={label ? undefined : "true"}>
        <defs>
          <clipPath id={eyeClipId}>
            <circle cx="285" cy="180" r="39" />
          </clipPath>
        </defs>

        {/* Top arm — static brand geometry, unchanged from ExchangeNotesMark */}
        <path
          d="M 300,70 Q 110,70 100,180"
          fill="none"
          stroke="#1c1a16"
          strokeWidth="52"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Bottom arm — static brand geometry, unchanged from ExchangeNotesMark */}
        <path
          d="M 100,180 Q 110,320 300,320"
          fill="none"
          stroke="#1c1a16"
          strokeWidth="52"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Middle bar — Yumi's tongue, see the scope note above. Drawn a
            touch thicker than the static top/bottom arms (58 vs 52) so it
            reads clearly as "the part that moves" rather than blending into
            the rest of the mark's outline. */}
        <line
          x1={TONGUE_PIVOT.x}
          y1={TONGUE_PIVOT.y}
          x2={tip.x}
          y2={tip.y}
          stroke="#1c1a16"
          strokeWidth="58"
          strokeLinecap="round"
          className={styles.tongueBar}
        />

        {showContact ? (
          <circle
            cx={tip.x}
            cy={tip.y}
            r="11"
            fill="#c9962e"
            className={reducedMotion ? styles.contactStatic : styles.contactPulse}
          />
        ) : null}

        {/* Voicing glow — a soft pulse behind the eye while the sound is
            voiced (vocal cords vibrating), so "voice" reads as visible even
            if you're not staring right at the mouth. Sits behind the eye
            (drawn first) so it never covers the pupil/lids. Voiceless
            sounds simply don't render this — a stable, unlit eye is itself
            the "no vibration" signal, no separate indicator needed. */}
        {showVoicing ? (
          <circle
            cx="285"
            cy="180"
            r="52"
            fill="#c9962e"
            className={reducedMotion ? styles.voicingGlowStatic : styles.voicingGlow}
            aria-hidden="true"
          />
        ) : null}

        {/* Eye — same shape/colors as ExchangeNotesMark */}
        <circle cx="285" cy="180" r="40" fill="#faf7f0" />
        <g clipPath={`url(#${eyeClipId})`}>
          <g className={styles.pupil}>
            <circle cx="294" cy="172" r="14" fill="#1c1a16" />
            <circle cx="300" cy="166" r="5" fill="#ffffff" />
          </g>
          <rect className={`yumi-blink-upper ${styles.upperLid}`} x="245" y="100" width="80" height="120" fill="#faf7f0" />
          <rect className={`yumi-blink-lower ${styles.lowerLid}`} x="245" y="215" width="80" height="25" fill="#faf7f0" />
        </g>
        <circle cx="285" cy="180" r="40" fill="none" stroke="#1c1a16" strokeWidth="12" />

        {/* Mouth */}
        <ellipse
          cx={mouth.cx}
          cy={mouth.cy}
          rx={mouth.rx}
          ry={mouth.ry}
          className={`${styles.mouth} ${showVoicing ? styles.voicing : ""}`}
          style={{ "--mouth-speed": `${mouthSpeedMs}ms` } as CSSProperties}
        />

        {/* Airflow — three short streaks near where air actually exits (the
            mouth, or up toward the nose for nasal sounds). Styled per
            airflow.path via CSS (burst/friction/nasal), scaled by
            airflow.intensity so aspirated sounds visibly puff harder. */}
        {showAirflow ? (
          <g
            transform={`translate(${airflowOriginPoint.x}, ${airflowOriginPoint.y})`}
            className={`${styles.airflow} ${styles[`airflow-${airflowPath}`] ?? ""}`}
            style={{ opacity: 0.4 + activePose.airflow.intensity * 0.5 }}
            aria-hidden="true"
          >
            <path d="M0,-9 Q14,-12 26,-10" className={styles.airflowLine} />
            <path d="M0,0 Q16,-1 30,0" className={styles.airflowLine} />
            <path d="M0,9 Q14,11 26,12" className={styles.airflowLine} />
          </g>
        ) : null}
      </svg>
    </div>
  );
}
