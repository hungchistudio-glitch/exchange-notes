"use client";

import { useCallback, useEffect, useState } from "react";

import ExchangeNotesMark from "@/components/ui/ExchangeNotesMark";

import styles from "./ExchangeNotesLaunchV3.module.css";

type Props = {
  reviewMode?: boolean;
  onComplete?: () => void;
};

const DURATION = 3000;
const REDUCED_DURATION = 1200;

export default function ExchangeNotesLaunchV3({
  reviewMode = false,
  onComplete,
}: Props) {
  const [runId, setRunId] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const duration = reduced ? REDUCED_DURATION : DURATION;
    const started = performance.now();

    let raf = 0;
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;

      if (now - started >= duration) {
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
    setFinished(false);
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
          <svg
            className={styles.backEffects}
            viewBox="0 0 400 400"
            aria-hidden="true"
          >
            <defs>
              <filter
                id="exchange-launch-blur"
                x="-100%"
                y="-100%"
                width="300%"
                height="300%"
              >
                <feGaussianBlur stdDeviation="8" />
              </filter>
            </defs>

            <g className={styles.leftWing}>
              <path
                className={styles.wingBloom}
                d="M 72 72 Q -35 92 -42 180 Q -35 268 72 288"
              />
              <path
                className={styles.wingRail}
                d="M 72 72 Q -35 92 -42 180 Q -35 268 72 288"
              />
              <path
                className={styles.wingParticles}
                pathLength="100"
                d="M 72 72 Q -35 92 -42 180 Q -35 268 72 288"
              />
            </g>

            <g className={styles.rightWing}>
              <path
                className={styles.wingBloom}
                d="M 328 72 Q 435 92 442 180 Q 435 268 328 288"
              />
              <path
                className={styles.wingRail}
                d="M 328 72 Q 435 92 442 180 Q 435 268 328 288"
              />
              <path
                className={styles.wingParticles}
                pathLength="100"
                d="M 328 72 Q 435 92 442 180 Q 435 268 328 288"
              />
            </g>

            <path
              className={styles.beamBloom}
              pathLength="100"
              d="M -125 180 L 285 180"
            />

            <path
              className={styles.beamHalo}
              pathLength="100"
              d="M -125 180 L 285 180"
            />

            <path
              className={styles.beamCore}
              pathLength="100"
              d="M -125 180 L 285 180"
            />
          </svg>

          <ExchangeNotesMark
            className={styles.mark}
            surfaceColor="#f5f3ed"
            highlightColor="#ffffff"
            withTile={false}
            cosmic={false}
            energy={0}
          />

          <svg
            className={styles.frontEffects}
            viewBox="0 0 400 400"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="exchange-eye-halo">
                <stop
                  offset="0"
                  stopColor="#ffffff"
                  stopOpacity="0.75"
                />
                <stop
                  offset="0.36"
                  stopColor="#dfe6f0"
                  stopOpacity="0.20"
                />
                <stop
                  offset="1"
                  stopColor="#bdc9da"
                  stopOpacity="0"
                />
              </radialGradient>
            </defs>

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

            <path
              className={styles.connectorEnergy}
              pathLength="100"
              d="M 100 180 L 250 180"
            />

            <circle
              className={styles.eyeHalo}
              cx="285"
              cy="180"
              r="72"
              fill="url(#exchange-eye-halo)"
            />

            <circle
              className={styles.exchangePulse}
              cx="285"
              cy="180"
              r="56"
            />

            <g className={styles.exchangeArrows}>
              <path d="M 219 180 H 248" />
              <path d="M 229 169 L 217 180 L 229 191" />

              <path d="M 322 180 H 351" />
              <path d="M 341 169 L 353 180 L 341 191" />
            </g>

            <g className={styles.eyeShutter}>
              <ellipse
                className={styles.eyeCover}
                cx="285"
                cy="180"
                rx="41"
                ry="41"
              />
              <path
                className={styles.eyeSeam}
                d="M 255 181 Q 285 177 315 181"
              />
            </g>

            <g className={styles.completeEye}>
              <circle
                className={styles.eyeShell}
                cx="285"
                cy="180"
                r="39"
              />

              <circle
                className={styles.eyeIris}
                cx="299"
                cy="170"
                r="13"
              />

              <circle
                className={styles.eyePupil}
                cx="299"
                cy="170"
                r="8.5"
              />

              <circle
                className={styles.eyeCatchlight}
                cx="303"
                cy="166"
                r="3.8"
              />
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
            3.000s · Storyboard Review
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
