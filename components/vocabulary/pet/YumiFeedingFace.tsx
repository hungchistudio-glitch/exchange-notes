"use client";

import type { RefObject } from "react";

import type { YumiFeedingPhase } from "@/hooks/pet/useYumiFeedingSequence";

import styles from "./YumiFeedingFace.module.css";

type YumiFeedingFaceProps = {
  phase: YumiFeedingPhase;
  chewBeat?: number;
  targetRef?: RefObject<HTMLSpanElement | null>;
};

export default function YumiFeedingFace({
  phase,
  chewBeat = 0,
  targetRef,
}: YumiFeedingFaceProps) {
  return (
    <div
      className={styles.overlay}
      data-feeding-phase={phase}
      data-chew-beat={chewBeat}
      aria-hidden="true"
    >
      <span ref={targetRef} className={styles.target} />

      <svg
        className={styles.face}
        viewBox="0 0 400 400"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="yumi-mouth-depth" cx="50%" cy="34%" r="72%">
            <stop offset="0" stopColor="#3f4147" />
            <stop offset="0.52" stopColor="#111216" />
            <stop offset="1" stopColor="#020203" />
          </radialGradient>
          <linearGradient id="yumi-tongue-silver" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d6d7da" />
            <stop offset="0.45" stopColor="#8d9097" />
            <stop offset="1" stopColor="#484a50" />
          </linearGradient>
          <radialGradient id="yumi-cheek-light" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.46" />
            <stop offset="1" stopColor="#b7bac0" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g className={styles.mouthAssembly}>
          <ellipse
            className={styles.leftCheek}
            cx="257"
            cy="242"
            rx="20"
            ry="13"
            fill="url(#yumi-cheek-light)"
          />
          <ellipse
            className={styles.rightCheek}
            cx="321"
            cy="242"
            rx="17"
            ry="12"
            fill="url(#yumi-cheek-light)"
          />

          <ellipse
            className={styles.mouthCavity}
            cx="289"
            cy="245"
            rx="21"
            ry="11"
            fill="url(#yumi-mouth-depth)"
            stroke="#08090b"
            strokeWidth="5"
          />

          <path
            className={styles.upperLip}
            d="M267 243 Q289 229 311 243"
            fill="none"
            stroke="#090a0c"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            className={styles.lowerLip}
            d="M269 247 Q289 260 309 247"
            fill="none"
            stroke="#35373c"
            strokeWidth="5"
            strokeLinecap="round"
          />

          <path
            className={styles.tongue}
            d="M276 250 Q289 244 302 250 Q299 257 289 258 Q279 257 276 250 Z"
            fill="url(#yumi-tongue-silver)"
          />

          <path
            className={styles.upperTeeth}
            d="M273 243 Q289 234 305 243 Q289 240 273 243 Z"
            fill="#f4f4f2"
            fillOpacity="0.88"
          />

          <path
            className={styles.lowerTeeth}
            d="M274 248 Q289 255 304 248 Q289 251 274 248 Z"
            fill="#c9cbd0"
            fillOpacity="0.72"
          />

          <path
            className={styles.smile}
            d="M270 243 Q289 258 308 243"
            fill="none"
            stroke="#111216"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </g>

        <g className={styles.biteEnergy}>
          <circle cx="319" cy="231" r="3" />
          <circle cx="327" cy="240" r="2" />
          <circle cx="316" cy="252" r="2.5" />
        </g>

        <g className={styles.swallowTrack}>
          <path
            d="M289 255 Q281 272 252 289"
            fill="none"
            stroke="#bfc1c6"
            strokeOpacity="0.26"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle
            className={styles.swallowPulse}
            cx="287"
            cy="258"
            r="7"
            fill="#e6e7e9"
          />
        </g>
      </svg>
    </div>
  );
}
