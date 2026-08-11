"use client";

import { useCallback, useEffect, useState } from "react";

import ExchangeNotesMark from "@/components/ui/ExchangeNotesMark";

import styles from "./ExchangeNotesLaunchV3.module.css";

type Props = {
  reviewMode?: boolean;
  onComplete?: () => void;
};

const FULL_DURATION = 3000;
const REDUCED_DURATION = 1200;

export default function ExchangeNotesLaunchV3({
  reviewMode = false,
  onComplete,
}: Props) {
  const [runId, setRunId] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    setFinished(false);

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const duration = reduced
      ? REDUCED_DURATION
      : FULL_DURATION;

    const startedAt = performance.now();

    let raf = 0;
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;

      if (now - startedAt >= duration) {
        setFinished(true);
        onComplete?.();
        return;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [runId, onComplete]);

  const replay = useCallback(() => {
    setRunId((value) => value + 1);
  }, []);

  return (
    <div
      className={`${styles.launch} ${
        reviewMode ? styles.reviewMode : ""
      }`}
      role="status"
      aria-label="Opening Exchange Notes"
    >
      <div key={runId} className={styles.sequence}>
        <div className={styles.backgroundGlow} />
        <div className={styles.grain} />
        <div className={styles.vignette} />

        <div className={styles.stage}>
          {/* Back cinematic structures */}
          <svg
            className={styles.backEffects}
            viewBox="0 0 400 400"
            aria-hidden="true"
          >
            <defs>
              <filter
                id="en-launch-blur"
                x="-80%"
                y="-80%"
                width="260%"
                height="260%"
              >
                <feGaussianBlur stdDeviation="8" />
              </filter>
            </defs>

            <g className={styles.leftWing}>
              <path
                className={styles.wingBloom}
                d="M 72 75 Q -34 88 -38 180 Q -34 272 72 285"
              />
              <path
                className={styles.wingRail}
                d="M 72 75 Q -34 88 -38 180 Q -34 272 72 285"
              />
              <path
                className={styles.wingParticles}
                pathLength="100"
                d="M 72 75 Q -34 88 -38 180 Q -34 272 72 285"
              />
            </g>

            <g className={styles.rightWing}>
              <path
                className={styles.wingBloom}
                d="M 328 75 Q 434 88 438 180 Q 434 272 328 285"
              />
              <path
                className={styles.wingRail}
                d="M 328 75 Q 434 88 438 180 Q 434 272 328 285"
              />
              <path
                className={styles.wingParticles}
                pathLength="100"
                d="M 328 75 Q 434 88 438 180 Q 434 272 328 285"
              />
            </g>

            <path
              className={styles.beamBloom}
              pathLength="100"
              d="M -100 180 L 285 180"
            />

            <path
              className={styles.beamHalo}
              pathLength="100"
              d="M -100 180 L 285 180"
            />

            <path
              className={styles.beamCore}
              pathLength="100"
              d="M -100 180 L 285 180"
            />
          </svg>

          {/*
            IMPORTANT:
            This is the actual existing production brand mark.
            We do not redraw Yumi.
          */}
          <ExchangeNotesMark
            className={styles.mark}
            surfaceColor="#f5f3ed"
            highlightColor="#ffffff"
            withTile={false}
            cosmic={false}
            energy={0}
          />

          {/* Front effects use the exact canonical geometry */}
          <svg
            className={styles.frontEffects}
            viewBox="0 0 400 400"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="en-eye-halo">
                <stop
                  offset="0"
                  stopColor="#ffffff"
                  stopOpacity="0.75"
                />
                <stop
                  offset="0.38"
                  stopColor="#dfe7f2"
                  stopOpacity="0.20"
                />
                <stop
                  offset="1"
                  stopColor="#c5d1e2"
                  stopOpacity="0"
                />
              </radialGradient>
            </defs>

            {/* Exact canonical Yumi rail */}
            <path
              className={styles.railWake}
              pathLength="100"
              d="M 300 70 Q 110 70 100 180 Q 110 320 300 320"
            />

            <path
              className={styles.railParticles}
              pathLength="100"
              d="M 300 70 Q 110 70 100 180 Q 110 320 300 320"
            />

            {/* Exact canonical metallic connector */}
            <path
              className={styles.connectorEnergy}
              pathLength="100"
              d="M 100 180 L 250 180"
            />

            {/* Exact canonical eye center */}
            <circle
              className={styles.eyeHalo}
              cx="285"
              cy="180"
              r="70"
              fill="url(#en-eye-halo)"
            />

            <circle
              className={styles.exchangePulse}
              cx="285"
              cy="180"
              r="55"
            />

            <g className={styles.exchangeArrows}>
              <path d="M 218 180 H 249" />
              <path d="M 228 169 L 216 180 L 228 191" />

              <path d="M 321 180 H 352" />
              <path d="M 341 169 L 353 180 L 341 191" />
            </g>
          </svg>
        </div>

        <div className={styles.wordmark} aria-hidden="true">
          <div className={styles.exchangeWord}>
            EXCHANGE
          </div>

          <div className={styles.notesWord}>
            NOTES
          </div>
        </div>

        <div className={styles.horizon} aria-hidden="true">
          <div className={styles.horizonEdge} />

          <div className={styles.beacon}>
            <div className={styles.beaconGlow} />
            <div className={styles.beaconHead} />
            <div className={styles.beaconStem} />
          </div>
        </div>
      </div>

      {reviewMode && (
        <div
          className={`${styles.reviewControls} ${
            finished ? styles.reviewControlsVisible : ""
          }`}
        >
          <span className={styles.reviewLabel}>
            3.000s · Exchange Notes Launch
          </span>

          <button
            type="button"
            className={styles.replayButton}
            onClick={replay}
          >
            Replay
          </button>
        </div>
      )}
    </div>
  );
}
