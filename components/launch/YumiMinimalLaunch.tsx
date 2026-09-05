"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";

import ExchangeNotesLogo from "@/components/brand/ExchangeNotesLogo";
import {
  LOGO_TIERS,
  exchangeNotesLogoGeometry,
} from "@/lib/brand/exchangeNotesLogo";

import styles from "./YumiMinimalLaunch.module.css";
import type { LaunchRendererProps } from "./types";
import {
  YUMI_MINIMAL_CHECKPOINTS,
  YUMI_MINIMAL_DURATION_MS,
  YUMI_MINIMAL_REDUCED_DURATION_MS,
  buildYumiMinimalTracks,
  computeYumiMinimalFrame,
} from "./yumiMinimalTimeline";

const FIRST_FRAME = computeYumiMinimalFrame(0);
const geometry = exchangeNotesLogoGeometry({
  canvas: 512,
  ...LOGO_TIERS.inApp,
});

/* The elastic core is deliberately finer than the eye ring at launch scale. */
const coreBridgeStrokeWidth = geometry.strokes.ring * 0.65;
const bridgeOrigin = `${(geometry.bridge.x1 / geometry.canvas) * 100}%`;
const eyeClipId = "yumi-minimal-eye-field";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

const readReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;
const readServerReducedMotion = () => false;

type YumiMinimalLaunchProps = LaunchRendererProps & {
  /** Pins a mode in tests or a dedicated review link. */
  forceReducedMotion?: boolean;
  /** The real app supplies the handoff. The isolated route uses this stand-in. */
  showHandoffPreview?: boolean;
  /** Allows a clean, control-free recording from the review route. */
  showReviewControls?: boolean;
};

const asStyle = (frame: Record<string, string>) => frame as CSSProperties;

export default function YumiMinimalLaunch({
  launchId,
  reviewMode = false,
  onComplete,
  forceReducedMotion,
  showHandoffPreview = reviewMode,
  showReviewControls = reviewMode,
}: YumiMinimalLaunchProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrubberRef = useRef<HTMLInputElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef(0);
  const currentTimeRef = useRef(0);
  const previousFrameRef = useRef<Record<string, string> | null>(FIRST_FRAME);
  const onCompleteRef = useRef(onComplete);

  const systemReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    readReducedMotion,
    readServerReducedMotion,
  );
  const [motionOverride, setMotionOverride] = useState<boolean | null>(null);
  const reducedMotion =
    motionOverride ?? forceReducedMotion ?? systemReducedMotion;
  const [playing, setPlaying] = useState(true);
  const [runId, setRunId] = useState(0);

  const duration = reducedMotion
    ? YUMI_MINIMAL_REDUCED_DURATION_MS
    : YUMI_MINIMAL_DURATION_MS;

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const paint = useCallback(
    (time: number, reduced = reducedMotion) => {
      const root = rootRef.current;
      if (!root) return;

      const nextFrame = computeYumiMinimalFrame(time, reduced);
      const previousFrame = previousFrameRef.current;

      for (const property in nextFrame) {
        if (previousFrame?.[property] === nextFrame[property]) continue;
        root.style.setProperty(property, nextFrame[property]);
      }

      previousFrameRef.current = nextFrame;

      if (readoutRef.current) {
        readoutRef.current.textContent = `${(time / 1000).toFixed(3)}s`;
      }
      if (
        scrubberRef.current &&
        document.activeElement !== scrubberRef.current
      ) {
        scrubberRef.current.value = `${time}`;
      }
    },
    [reducedMotion],
  );

  /*
   * The opening itself, handed to the compositor.
   *
   * One animation per element, transform and opacity only, so the browser can
   * run them off the main thread. That matters more here than anywhere else
   * in the app: this plays while the app is booting — hydrating, parsing
   * chunks, fetching the reader's words — and a frame-at-a-time JavaScript
   * animation competes with all of it and loses. The stutter used to land on
   * the first thing anyone sees.
   *
   * The review tool keeps the JavaScript path below, because scrubbing is a
   * request to be at a time rather than to travel through one.
   */
  useEffect(() => {
    if (reviewMode || !playing) return;

    const root = rootRef.current;
    if (!root || typeof root.animate !== "function") return;

    const tracks = buildYumiMinimalTracks(reducedMotion);
    const animations: Animation[] = [];

    for (const [name, keyframes] of Object.entries(tracks)) {
      const element = root.querySelector<HTMLElement>(
        `[data-track="${name}"]`,
      );

      // The handoff preview is only rendered for part of the sequence.
      if (!element) continue;

      animations.push(
        element.animate(keyframes, {
          duration,
          // Sampled at a fixed rate, so the shape is already in the samples.
          easing: "linear",
          fill: "both",
        }),
      );
    }

    if (animations.length === 0) return;

    let done = false;

    /*
     * Every track is the same length, so the first one to finish has
     * finished them all. `finished` rejects when an animation is cancelled,
     * which is what the cleanup below does, so the rejection is the ordinary
     * unmount path and not a failure.
     */
    void animations[0].finished
      .then(() => {
        if (done) return;
        done = true;
        setPlaying(false);
        onCompleteRef.current?.();
      })
      .catch(() => {});

    return () => {
      done = true;
      for (const animation of animations) animation.cancel();
    };
  }, [duration, playing, reducedMotion, reviewMode]);

  /*
   * The review tool's clock. Scrubbing, pausing and replaying all want a
   * specific time painted, which is what the frame function is for.
   */
  useEffect(() => {
    if (!reviewMode || !playing) return;

    let origin = 0;

    const tick = (now: number) => {
      if (origin === 0) origin = now - currentTimeRef.current;

      const time = Math.min(duration, now - origin);
      currentTimeRef.current = time;
      paint(time);

      if (time >= duration) {
        setPlaying(false);
        return;
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [duration, paint, playing, reviewMode, runId]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  const restartClock = useCallback(() => {
    currentTimeRef.current = 0;
    previousFrameRef.current = null;
    paint(0);
    setPlaying(true);
    setRunId((value) => value + 1);
  }, [paint]);

  /*
   * Review-only. The opening itself never restarts — it plays once per
   * document load and hands the screen over.
   */
  const replay = useCallback(() => {
    restartClock();
  }, [restartClock]);

  const togglePlaying = useCallback(() => {
    if (playing) {
      setPlaying(false);
      return;
    }

    if (currentTimeRef.current >= duration) {
      replay();
      return;
    }

    setPlaying(true);
    setRunId((value) => value + 1);
  }, [duration, playing, replay]);

  const seek = useCallback(
    (time: number) => {
      const nextTime = Math.min(duration, Math.max(0, time));
      currentTimeRef.current = nextTime;
      setPlaying(false);
      paint(nextTime);
    },
    [duration, paint],
  );

  const toggleMotionMode = useCallback(() => {
    currentTimeRef.current = 0;
    previousFrameRef.current = null;
    setMotionOverride(!reducedMotion);
    setPlaying(true);
    setRunId((value) => value + 1);
  }, [reducedMotion]);

  const closedEyeX = geometry.eye.cx - geometry.eye.fieldRadius * 0.58;
  const closedEyeEndX = geometry.eye.cx + geometry.eye.fieldRadius * 0.58;

  return (
    <div
      ref={rootRef}
      className={styles.launch}
      style={asStyle(FIRST_FRAME)}
      data-launch-id={launchId}
      data-playing={playing ? "" : undefined}
      data-reduced-motion={reducedMotion ? "" : undefined}
      role={reviewMode ? "region" : undefined}
      aria-label={reviewMode ? "Yumi minimal opening animation review" : undefined}
      aria-hidden={reviewMode ? undefined : true}
    >
      {/*
        The white ground, as a layer rather than the root's background-colour.
        A background-color cannot be composited — fading one across the whole
        viewport repaints the whole viewport every frame — while the opacity
        of a plain sheet can be handed to the compositor and forgotten about.
      */}
      <div data-track="sceneWash" className={styles.sceneWash} aria-hidden="true" />

      {showHandoffPreview && (
        <div data-track="handoffPreview" className={styles.handoffPreview} aria-hidden="true">
          <header className={styles.previewHeader}>
            <ExchangeNotesLogo className={styles.previewLogo} decorative />
            <strong>Exchange Notes</strong>
            <span className={styles.previewAvatar}>Y</span>
          </header>

          <main className={styles.previewContent}>
            <span className={styles.previewEyebrow}>TODAY</span>
            <h2>What do you want to remember?</h2>
            <div className={styles.previewCaptureRow}>
              <span>Write</span>
              <span>Voice</span>
              <span>Camera</span>
            </div>
          </main>

          <nav className={styles.previewDock} aria-label="Preview navigation">
            <i />
            <i />
            <i />
            <i />
            <i />
          </nav>
        </div>
      )}

      <div data-track="brandScene" className={styles.brandScene} aria-hidden="true">
        <div className={styles.actorAnchor}>
          <div data-track="actorEntry" className={styles.actorEntry}>
            <div data-track="actorReaction" className={styles.actorReaction}>
              <svg
                className={styles.yumi}
                viewBox={`0 0 ${geometry.canvas} ${geometry.canvas}`}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ "--bridge-origin-x": bridgeOrigin } as CSSProperties}
              >
                <defs>
                  <clipPath id={eyeClipId}>
                    <circle
                      cx={geometry.eye.cx}
                      cy={geometry.eye.cy}
                      r={geometry.eye.fieldRadius}
                    />
                  </clipPath>
                </defs>

                <path
                  className={styles.bodyArc}
                  d={geometry.arc.d}
                  strokeWidth={geometry.strokes.main}
                />

                <path
                  data-track="coreBridge" className={styles.coreBridge}
                  d={geometry.bridge.d}
                  strokeWidth={coreBridgeStrokeWidth}
                  vectorEffect="non-scaling-stroke"
                />

                <g data-track="eyeAssembly" className={styles.eyeAssembly}>
                  <circle
                    className={styles.eyeField}
                    cx={geometry.eye.cx}
                    cy={geometry.eye.cy}
                    r={geometry.eye.ringRadius}
                    strokeWidth={geometry.strokes.ring}
                  />

                  <g clipPath={`url(#${eyeClipId})`}>
                    <g data-track="pupilGroup" className={styles.pupilGroup}>
                      <circle
                        className={styles.pupil}
                        cx={geometry.pupil.cx}
                        cy={geometry.pupil.cy}
                        r={geometry.pupil.r}
                      />
                      {geometry.highlight && (
                        <circle
                          className={styles.catchlight}
                          cx={geometry.highlight.cx}
                          cy={geometry.highlight.cy}
                          r={geometry.highlight.r}
                        />
                      )}
                    </g>

                    <path
                      data-track="closedEye" className={styles.closedEye}
                      d={`M ${closedEyeX} ${geometry.eye.cy} Q ${geometry.eye.cx} ${
                        geometry.eye.cy + geometry.pupil.r * 0.18
                      } ${closedEyeEndX} ${geometry.eye.cy}`}
                    />

                  </g>
                </g>
              </svg>
            </div>
          </div>
        </div>

        <div data-track="wordmark" className={styles.wordmark}>Exchange Notes</div>
      </div>

      {showReviewControls && (
        <section className={styles.reviewControls} aria-label="Animation controls">
          <div className={styles.controlTopline}>
            <span ref={readoutRef} className={styles.timeReadout}>
              0.000s
            </span>
            <span className={styles.motionReadout} role="status">
              {reducedMotion ? "Reduced motion" : "Full motion"}
            </span>
          </div>

          <input
            ref={scrubberRef}
            className={styles.scrubber}
            type="range"
            min="0"
            max={duration}
            step="1"
            defaultValue="0"
            onChange={(event) => seek(Number(event.target.value))}
            aria-label="Animation timeline"
          />

          <div className={styles.controlButtons}>
            <button type="button" onClick={togglePlaying}>
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              className={styles.primaryControl}
              onClick={replay}
            >
              Replay
            </button>
            <button type="button" onClick={toggleMotionMode}>
              {reducedMotion ? "Full motion" : "Reduced motion"}
            </button>
          </div>

          <div className={styles.checkpoints}>
            {YUMI_MINIMAL_CHECKPOINTS.map(([time, label]) => (
              <button key={time} type="button" onClick={() => seek(time)}>
                {label}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
