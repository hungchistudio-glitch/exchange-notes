"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import styles from "./ExchangeNotesLaunch.module.css";
import {
  CHECKPOINTS,
  LAUNCH_DURATION_MS,
  clamp,
  computeFrame,
} from "./timeline";

type Props = {
  /** Renders the scrub/checkpoint harness and never fires `onComplete`. */
  reviewMode?: boolean;
  onComplete?: () => void;
};

/** How long the launch takes to dissolve into the app underneath it. */
const EXIT_MS = 420;

/** How long the finished frame is held before exiting, for reduced motion. */
const REDUCED_HOLD_MS = 700;

/*
 * A backstop for the case rAF never runs to completion — a tab backgrounded
 * for the whole animation, or a device that throttles timers hard. Without
 * it the overlay would sit on top of the app forever, because completion is
 * driven by frames rather than by the clock.
 */
const SAFETY_MS = LAUNCH_DURATION_MS + EXIT_MS + 4000;

const FIRST_FRAME = computeFrame(0);

const asStyle = (frame: Record<string, string>) => frame as CSSProperties;

export default function ExchangeNotesLaunch({
  reviewMode = false,
  onComplete,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const scrubberRef = useRef<HTMLInputElement>(null);

  const frameRef = useRef(0);
  const originRef = useRef(0);
  const timeRef = useRef(0);
  const finishedRef = useRef(false);

  const [playing, setPlaying] = useState(true);
  const [exiting, setExiting] = useState(false);

  /*
   * Held in a ref rather than read from props inside the loop's effect. As a
   * dependency it would tear down and restart the animation every time a
   * parent re-rendered with a fresh inline callback — which is exactly how a
   * launch animation ends up stuttering or silently replaying.
   */
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  /*
   * The properties written on the previous frame, so the next one can write
   * only what actually moved.
   */
  const previousRef = useRef<Record<string, string> | null>(FIRST_FRAME);

  /**
   * Writes a frame straight to the DOM — no state is set, so React never
   * re-renders during playback.
   *
   * The diff matters as much as skipping React does. Every one of these
   * properties is read by descendants of this element, so setting one
   * invalidates style for the whole scene; setting all forty invalidates it
   * forty times over, every frame, for the entire animation. That cost is
   * flat regardless of what is actually moving, which is why the quiet
   * stretches used to be as expensive as the busy ones. Most frames change
   * only a handful of values.
   */
  const paint = useCallback((time: number) => {
    const root = rootRef.current;
    if (!root) return;

    const frame = computeFrame(time);
    const previous = previousRef.current;

    for (const property in frame) {
      if (previous && previous[property] === frame[property]) continue;
      root.style.setProperty(property, frame[property]);
    }

    previousRef.current = frame;

    if (readoutRef.current) {
      readoutRef.current.textContent = `${(time / 1000).toFixed(3)}s`;
    }
    if (scrubberRef.current && document.activeElement !== scrubberRef.current) {
      scrubberRef.current.value = `${time}`;
    }
  }, []);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    if (reviewMode) return;

    setExiting(true);
    window.setTimeout(() => onCompleteRef.current?.(), EXIT_MS);
  }, [reviewMode]);

  /*
   * Reduced motion: resolve straight to the final frame, hold it long enough
   * to read, then hand over. Declared before the loop below so the ref is set
   * by the time the loop's effect decides whether to start — the review
   * harness opts out entirely, since its whole purpose is to show the motion.
   */
  const reducedRef = useRef(false);

  useEffect(() => {
    if (reviewMode) return;

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    reducedRef.current = true;
    timeRef.current = LAUNCH_DURATION_MS;
    paint(LAUNCH_DURATION_MS);

    const timer = window.setTimeout(finish, REDUCED_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [finish, paint, reviewMode]);

  /* The loop. */
  useEffect(() => {
    if (!playing || reducedRef.current) return;

    originRef.current = performance.now() - timeRef.current;

    const tick = (now: number) => {
      const time = Math.min(LAUNCH_DURATION_MS, now - originRef.current);

      timeRef.current = time;
      paint(time);

      if (time >= LAUNCH_DURATION_MS) {
        setPlaying(false);
        finish();
        return;
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameRef.current);
  }, [playing, paint, finish]);

  useEffect(() => {
    if (reviewMode) return;

    const timer = window.setTimeout(finish, SAFETY_MS);
    return () => window.clearTimeout(timer);
  }, [finish, reviewMode]);

  /* Tapping anywhere cuts to the app — a 2.5s hold is worth skipping. */
  const skip = useCallback(() => {
    if (reviewMode) return;
    cancelAnimationFrame(frameRef.current);
    setPlaying(false);
    finish();
  }, [finish, reviewMode]);

  /* --- review harness ------------------------------------------------ */

  const replay = useCallback(() => {
    finishedRef.current = false;
    timeRef.current = 0;

    /*
     * The origin is reset here as well as in the loop's effect. Replaying
     * while already playing leaves `playing` unchanged, so the effect does not
     * re-run and would otherwise keep measuring from the original start —
     * the timeline would snap straight back to where it was.
     */
    originRef.current = performance.now();

    paint(0);
    setPlaying(true);
  }, [paint]);

  const togglePlay = useCallback(() => {
    if (timeRef.current >= LAUNCH_DURATION_MS) {
      replay();
      return;
    }
    setPlaying((value) => !value);
  }, [replay]);

  const seek = useCallback(
    (value: number) => {
      const time = clamp(value, 0, LAUNCH_DURATION_MS);
      timeRef.current = time;
      setPlaying(false);
      paint(time);
    },
    [paint],
  );

  return (
    <div
      ref={rootRef}
      className={`${styles.launch} ${reviewMode ? styles.reviewMode : ""}`}
      /*
       * Always the opening frame, on both server and client, so hydration has
       * nothing to reconcile. Under reduced motion the effect above repaints
       * to the resolved frame on mount; at t=0 every layer is still at zero
       * opacity, so there is nothing to see in between.
       */
      style={asStyle(FIRST_FRAME)}
      data-exiting={exiting ? "" : undefined}
      onPointerDown={skip}
      role="status"
      aria-label="Opening Exchange Notes"
    >
      <div className={styles.space} aria-hidden="true">
        <div className={styles.stars} />
        <div className={styles.orbitA} />
        <div className={styles.orbitB} />
        <div className={styles.spaceSweep} />
      </div>

      <div className={styles.ambientBloom} aria-hidden="true" />
      <div className={styles.exchangeBloom} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />

      <div className={styles.radarField} aria-hidden="true">
        <div className={`${styles.radarRing} ${styles.radarRingOuter}`} />
        <div className={`${styles.radarRing} ${styles.radarRingMid}`} />
        <div className={`${styles.radarRing} ${styles.radarRingInner}`} />
        <div className={styles.radarSweep} />
        <div className={styles.calibrationSignals}>
          <div className={styles.scanBeamLeft} />
          <div className={styles.scanBeamRight} />
          <div className={styles.scanSparkLeft} />
          <div className={styles.scanSparkRight} />
        </div>
      </div>

      <div className={styles.depth} aria-hidden="true">
        <div className={styles.searchlightA} />
        <div className={styles.searchlightB} />
      </div>

      <div className={styles.stage} aria-hidden="true">
        <svg className={styles.scene} viewBox="0 0 400 400">
          <defs>
            <linearGradient id="launch-body" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#0b0e13" />
              <stop offset="0.48" stopColor="#29303a" />
              <stop offset="0.52" stopColor="#7b8592" />
              <stop offset="1" stopColor="#030407" />
            </linearGradient>

            <linearGradient id="launch-bar" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#8c939d" />
              <stop offset="0.48" stopColor="#f0f1f2" />
              <stop offset="0.7" stopColor="#bcc2cb" />
              <stop offset="1" stopColor="#5f6670" />
            </linearGradient>

            <radialGradient id="launch-halo">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.92" />
              <stop offset="0.28" stopColor="#dfe6ef" stopOpacity="0.18" />
              <stop offset="1" stopColor="#bcc9da" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle className={styles.signalNode} cx="154" cy="102" r="4.7" />

          <g className={styles.upperGroup}>
            <path className={styles.arcBloom} d="M 300 74 Q 122 74 106 180" />
            <path className={styles.arcBody} d="M 300 74 Q 122 74 106 180" />
            <path className={styles.arcSpec} d="M 286 86 Q 135 86 119 180" />
            <path
              className={styles.materialSweep}
              pathLength="100"
              d="M 286 86 Q 135 86 119 180"
            />
          </g>

          <g className={styles.lowerGroup}>
            <path className={styles.arcBloom} d="M 106 180 Q 122 286 300 286" />
            <path className={styles.arcBody} d="M 106 180 Q 122 286 300 286" />
            <path className={styles.arcSpec} d="M 119 180 Q 135 274 286 274" />
            <path
              className={styles.materialSweep}
              pathLength="100"
              d="M 119 180 Q 135 274 286 274"
            />
          </g>

          <path
            className={styles.railLight}
            d="M 300 74 Q 122 74 106 180 Q 122 286 300 286"
            pathLength="100"
          />

          <path
            className={styles.railParticles}
            d="M 300 74 Q 122 74 106 180 Q 122 286 300 286"
            pathLength="100"
          />

          <g className={styles.connectorGroup}>
            <rect
              className={styles.connectorGlow}
              x="84"
              y="164"
              width="172"
              height="32"
              rx="16"
            />
            <rect
              className={styles.connectorBody}
              x="84"
              y="166"
              width="170"
              height="28"
              rx="14"
            />
            <rect
              className={styles.connectorSpec}
              x="98"
              y="170"
              width="142"
              height="4"
              rx="2"
            />
          </g>

          <g className={styles.eyeHousingGroup}>
            <circle
              className={styles.coreHalo}
              cx="286"
              cy="180"
              r="70"
              fill="url(#launch-halo)"
            />
            <circle className={styles.eyeRing} cx="286" cy="180" r="31" />
            <circle className={styles.darkLens} cx="286" cy="180" r="22" />

            <g className={styles.finalEye}>
              <circle className={styles.eyeWhite} cx="286" cy="180" r="22" />
              <circle className={styles.eyeGlass} cx="286" cy="180" r="20.2" />

              <g className={styles.pupilGroup}>
                <circle className={styles.eyeIris} cx="298" cy="173" r="9.4" />
                <circle className={styles.eyePupil} cx="298" cy="173" r="5.2" />
                <circle
                  className={styles.eyeCatchlight}
                  cx="302"
                  cy="169"
                  r="1.7"
                />
              </g>
            </g>
          </g>

          <g className={styles.exchangeField}>
            <circle className={styles.exchangePulse} cx="286" cy="180" r="52" />
          </g>
        </svg>
      </div>

      <div className={styles.identity} aria-hidden="true">
        <div className={styles.exchangeWord}>EXCHANGE</div>
        <div className={styles.notesWord}>NOTES</div>
      </div>

      <div className={styles.horizon} aria-hidden="true">
        <div className={styles.horizonEdge} />
        <div className={styles.beacon}>
          <div className={styles.beaconGlow} />
          <div className={styles.beaconPoint} />
          <div className={styles.beaconStem} />
        </div>
      </div>

      {reviewMode && (
        <div className={styles.reviewPanel}>
          <div className={styles.reviewTop}>
            <span ref={readoutRef}>0.000s</span>

            <button type="button" onClick={togglePlay}>
              {playing ? "Pause" : "Play"}
            </button>

            <button type="button" onClick={replay}>
              Replay
            </button>
          </div>

          <input
            ref={scrubberRef}
            className={styles.scrubber}
            type="range"
            min="0"
            max={LAUNCH_DURATION_MS}
            step="10"
            defaultValue={0}
            onChange={(event) => seek(Number(event.target.value))}
            aria-label="Animation timeline"
          />

          <div className={styles.checkpoints}>
            {CHECKPOINTS.map(([value, label]) => (
              <button key={value} type="button" onClick={() => seek(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
