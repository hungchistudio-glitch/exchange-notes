"use client";

import { useEffect, useId, useState } from "react";

import { YUMI_IDLE_POSE, type YumiAnimationState, type YumiRigPose } from "@/lib/pronunciation/yumiRig";

import styles from "./YumiFace.module.css";

type YumiFaceProps = {
  pose: YumiRigPose;
  phase: YumiAnimationState;
  size?: number;
  label?: string;
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
// lipRoundness / lipClosure — see the scope note further down for why this
// replaced the old separate mouth-cavity diagram.
const MOUTH_TOP_Y = 228;
const MOUTH_CENTER_X = 195;

function mouthGeometry(mouth: YumiRigPose["mouth"]) {
  const openHeight = 8 + mouth.jawOpen * 44;
  const closedHeight = 7;
  const height = openHeight * (1 - mouth.lipClosure) + closedHeight * mouth.lipClosure;
  const width = 78 - mouth.lipRoundness * 40;

  return {
    cx: MOUTH_CENTER_X,
    cy: MOUTH_TOP_Y + height / 2,
    rx: width / 2,
    ry: Math.max(height / 2, 3),
  };
}

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
// Airflow isn't carried over (the brief's ask was specifically tongue
// placement + more life in Yumi herself); it still exists as pose data and
// backs the Mouth/Tongue/Airflow/Voice text steps in teachingSteps.ts.
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

export default function YumiFace({ pose, phase, size = 72, label }: YumiFaceProps) {
  const reducedMotion = useReducedMotion();
  const isActive = ACTIVE_PHASES.includes(phase);
  const activePose = isActive ? pose : YUMI_IDLE_POSE;
  const rawId = useId();
  const eyeClipId = `yumi-face-eye-${rawId.replace(/:/g, "")}`;

  const mouth = mouthGeometry(activePose.mouth);
  const tip = tongueTip(activePose);
  const showVoicing = activePose.voicing.voiced && isActive;
  const showContact = activePose.contact.zone !== "none" && CONTACT_PHASES.includes(phase);

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

        {/* Middle bar — Yumi's tongue, see the scope note above */}
        <line
          x1={TONGUE_PIVOT.x}
          y1={TONGUE_PIVOT.y}
          x2={tip.x}
          y2={tip.y}
          stroke="#1c1a16"
          strokeWidth="52"
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

        {/* Eye — same shape/colors as ExchangeNotesMark */}
        <circle cx="285" cy="180" r="40" fill="#faf7f0" />
        <g clipPath={`url(#${eyeClipId})`}>
          <g className={styles.pupil}>
            <circle cx="294" cy="172" r="14" fill="#1c1a16" />
            <circle cx="300" cy="166" r="5" fill="#ffffff" />
          </g>
          <rect className={styles.upperLid} x="245" y="100" width="80" height="120" fill="#faf7f0" />
          <rect className={styles.lowerLid} x="245" y="215" width="80" height="25" fill="#faf7f0" />
        </g>
        <circle cx="285" cy="180" r="40" fill="none" stroke="#1c1a16" strokeWidth="12" />

        {/* Mouth */}
        <ellipse
          cx={mouth.cx}
          cy={mouth.cy}
          rx={mouth.rx}
          ry={mouth.ry}
          className={`${styles.mouth} ${showVoicing ? styles.voicing : ""}`}
        />
      </svg>
    </div>
  );
}
