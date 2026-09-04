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
import { getLaunchSoundEnabled } from "@/lib/appPreferences";
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
  computeYumiMinimalFrame,
} from "./yumiMinimalTimeline";

const FIRST_FRAME = computeYumiMinimalFrame(0);
const AUDIO_SRC = "/audio/yumi-minimal-opening.m4a";

/*
 * play() as a promise, whatever the browser hands back.
 *
 * It returns a promise in every browser that matters and `undefined` in older
 * ones — and in jsdom, which is how the launch tests reach this file. It can
 * also throw synchronously rather than rejecting. All three end up the same
 * shape here, so callers only have to know about resolve and reject.
 */
function attemptPlay(audio: HTMLAudioElement): Promise<void> {
  try {
    return Promise.resolve(audio.play());
  } catch (error) {
    return Promise.reject(error);
  }
}

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
  const audioRef = useRef<HTMLAudioElement>(null);
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
  const [soundState, setSoundState] = useState<
    "silent" | "playing" | "blocked"
  >("silent");

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

  useEffect(() => {
    if (!playing) return;

    let origin = 0;

    const tick = (now: number) => {
      if (origin === 0) origin = now - currentTimeRef.current;

      const time = Math.min(duration, now - origin);
      currentTimeRef.current = time;
      paint(time);

      if (time >= duration) {
        setPlaying(false);
        if (!reviewMode) onCompleteRef.current?.();
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
      audioRef.current?.pause();
    },
    [],
  );

  /*
   * The opening tries to make its sound, and takes a tap as permission if the
   * browser will not give it.
   *
   * Nothing used to call play() outside the review route at all: the two
   * controls that do are behind showReviewControls, which SplashGate never
   * sets. So the audio element mounted, downloaded its 45KB on every signed-in
   * load, and was never once asked to play.
   *
   * Wiring it up is not enough on its own, because this runs at document load
   * — before any interaction — and that is exactly what autoplay policies
   * refuse. Desktop Chrome often allows it; iOS Safari, which is where this is
   * installed as an app, essentially never does on a cold start, and no amount
   * of unlocking on a previous visit survives a new document.
   *
   * So: ask, and if the answer is no, arm a single listener and let the first
   * touch anywhere start it from wherever the animation has got to. A reader
   * who touches nothing gets a silent opening, which is the same thing they
   * have today.
   */
  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || reviewMode || reducedMotion) return;
    if (!getLaunchSoundEnabled()) return;

    let disarmed = false;

    const startFromCurrentFrame = () => {
      audio.currentTime = Math.min(
        currentTimeRef.current / 1000,
        Math.max(0, (audio.duration || duration / 1000) - 0.05),
      );

      return attemptPlay(audio);
    };

    const disarm = () => {
      if (disarmed) return;
      disarmed = true;
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };

    function onGesture() {
      if (disarmed) return;
      disarm();

      void startFromCurrentFrame().then(
        () => setSoundState("playing"),
        () => setSoundState("blocked"),
      );
    }

    void attemptPlay(audio).then(
      () => {
        setSoundState("playing");
        disarm();
      },
      () => {
        setSoundState("blocked");

        // Refused for want of a gesture. The next one will do.
        if (!disarmed) {
          window.addEventListener("pointerdown", onGesture, { once: false });
          window.addEventListener("keydown", onGesture, { once: false });
        }
      },
    );

    return () => {
      disarm();
      audio.pause();
    };
    // Runs once per opening. runId changes only in review mode, which is
    // excluded above, so this deliberately does not depend on it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, reviewMode]);

  const restartClock = useCallback(() => {
    currentTimeRef.current = 0;
    previousFrameRef.current = null;
    paint(0);
    setPlaying(true);
    setRunId((value) => value + 1);
  }, [paint]);

  const replayWithSound = useCallback(() => {
    const audio = audioRef.current;

    restartClock();

    if (!audio || reducedMotion) {
      setSoundState("silent");
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1;

    void attemptPlay(audio).then(
      () => setSoundState("playing"),
      () => setSoundState("blocked"),
    );
  }, [reducedMotion, restartClock]);

  const togglePlaying = useCallback(() => {
    const audio = audioRef.current;

    if (playing) {
      setPlaying(false);
      audio?.pause();
      return;
    }

    if (currentTimeRef.current >= duration) {
      replayWithSound();
      return;
    }

    setPlaying(true);
    setRunId((value) => value + 1);

    if (audio && soundState === "playing" && !reducedMotion) {
      audio.currentTime = currentTimeRef.current / 1000;
      void attemptPlay(audio).catch(() => setSoundState("blocked"));
    }
  }, [duration, playing, reducedMotion, replayWithSound, soundState]);

  const seek = useCallback(
    (time: number) => {
      const nextTime = Math.min(duration, Math.max(0, time));
      currentTimeRef.current = nextTime;
      audioRef.current?.pause();
      setSoundState("silent");
      setPlaying(false);
      paint(nextTime);
    },
    [duration, paint],
  );

  const toggleMotionMode = useCallback(() => {
    audioRef.current?.pause();
    setSoundState("silent");
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
      data-sound={soundState}
      role={reviewMode ? "region" : undefined}
      aria-label={reviewMode ? "Yumi minimal opening animation review" : undefined}
      aria-hidden={reviewMode ? undefined : true}
    >
      <audio ref={audioRef} src={AUDIO_SRC} preload="auto" />

      {showHandoffPreview && (
        <div className={styles.handoffPreview} aria-hidden="true">
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

      <div className={styles.brandScene} aria-hidden="true">
        <div className={styles.actorAnchor}>
          <div className={styles.actorEntry}>
            <div className={styles.actorReaction}>
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
                  className={styles.coreBridge}
                  d={geometry.bridge.d}
                  strokeWidth={coreBridgeStrokeWidth}
                  vectorEffect="non-scaling-stroke"
                />

                <g className={styles.eyeAssembly}>
                  <circle
                    className={styles.eyeField}
                    cx={geometry.eye.cx}
                    cy={geometry.eye.cy}
                    r={geometry.eye.ringRadius}
                    strokeWidth={geometry.strokes.ring}
                  />

                  <g clipPath={`url(#${eyeClipId})`}>
                    <g className={styles.pupilGroup}>
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
                      className={styles.closedEye}
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

        <div className={styles.wordmark}>Exchange Notes</div>
      </div>

      {showReviewControls && (
        <section className={styles.reviewControls} aria-label="Animation controls">
          <div className={styles.controlTopline}>
            <span ref={readoutRef} className={styles.timeReadout}>
              0.000s
            </span>
            <span className={styles.soundReadout} role="status">
              {soundState === "blocked"
                ? "Sound needs another tap"
                : soundState === "playing"
                  ? "Reference sound on"
                  : reducedMotion
                    ? "Reduced motion · sound off"
                    : "Silent preview"}
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
              onClick={replayWithSound}
            >
              {reducedMotion ? "Replay" : "Replay + sound"}
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
