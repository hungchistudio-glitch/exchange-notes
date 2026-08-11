"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import ExchangeNotesMark from "@/components/ui/ExchangeNotesMark";

import styles from "./ExchangeNotesLaunchV4.module.css";

type Props = {
  reviewMode?: boolean;
  onComplete?: () => void;
};

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const DURATION = 3000;

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const phase = (time: number, start: number, end: number) =>
  clamp((time - start) / (end - start));

const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

const easeOut = (value: number) =>
  1 - Math.pow(1 - clamp(value), 3);

const lerp = (a: number, b: number, t: number) =>
  a + (b - a) * clamp(t);

const bell = (time: number, center: number, radius: number) =>
  clamp(1 - Math.abs(time - center) / radius);

export default function ExchangeNotesLaunchV4({
  reviewMode = false,
  onComplete,
}: Props) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);

  const startRef = useRef(0);
  const frameRef = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(frameRef.current);
      return;
    }

    startRef.current = performance.now() - time;

    const tick = (now: number) => {
      const next = Math.min(
        DURATION,
        now - startRef.current,
      );

      setTime(next);

      if (next >= DURATION) {
        setPlaying(false);

        if (!completedRef.current) {
          completedRef.current = true;

          if (!reviewMode) {
            onComplete?.();
          }
        }

        return;
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [playing, reviewMode, onComplete]);

  const replay = useCallback(() => {
    completedRef.current = false;
    setTime(0);
    setPlaying(true);
  }, []);

  const togglePlay = useCallback(() => {
    if (time >= DURATION) {
      completedRef.current = false;
      setTime(0);
      setPlaying(true);
      return;
    }

    setPlaying((value) => !value);
  }, [time]);

  const seek = useCallback((value: number) => {
    setPlaying(false);
    setTime(clamp(value, 0, DURATION));
  }, []);

  /*
    MASTER PHYSICS CLOCK

    0.00–0.48  Awaken
    0.48–1.12  Flow
    1.12–1.62  Exchange
    1.62–2.42  Complete / settle
    2.42–3.00  Identity reveal
    ~2.78       Eye opens
  */

  const awaken = smooth(phase(time, 0, 480));
  const flow = smooth(phase(time, 480, 1120));

  const exchangeIn = easeOut(
    phase(time, 1120, 1320),
  );

  const exchangeOut = 1 - smooth(
    phase(time, 1500, 1680),
  );

  const exchange = clamp(
    exchangeIn * exchangeOut,
  );

  const settle = smooth(
    phase(time, 1620, 2420),
  );

  const identity = smooth(
    phase(time, 2420, 2860),
  );

  const notesReveal = smooth(
    phase(time, 2520, 2920),
  );

  const horizon = smooth(
    phase(time, 2520, 2940),
  );

  const eyeOpen = smooth(
    phase(time, 2720, 2860),
  );

  const impact = smooth(
    bell(time, 1480, 145),
  );

  const bodyBrightness = lerp(
    0.72,
    1.04,
    identity,
  );

  const stageScale = time < 1620
    ? lerp(0.94, 1, awaken)
    : lerp(1, 0.57, settle);

  const stageY = time < 1620
    ? 0
    : lerp(0, -80, settle);

  const wingDistance = time < 1320
    ? lerp(185, 0, exchangeIn)
    : lerp(0, 230, 1 - exchangeOut);

  const railOpacity =
    clamp(
      awaken * (1 - identity * 0.42),
    );

  const beamOpacity =
    clamp(
      flow *
      (1 - phase(time, 1080, 1200)),
    );

  const particleOpacity =
    clamp(
      awaken *
      (1 - phase(time, 1740, 2260)),
    );

  let pupilX = -5;
  let pupilY = 2;

  if (eyeOpen > 0.28 && eyeOpen <= 0.68) {
    const move = smooth(
      phase(eyeOpen, 0.28, 0.68),
    );

    pupilX = lerp(-5, 3, move);
    pupilY = lerp(2, -1, move);
  } else if (eyeOpen > 0.68) {
    const settleEye = smooth(
      phase(eyeOpen, 0.68, 1),
    );

    pupilX = lerp(3, 0, settleEye);
    pupilY = lerp(-1, 0, settleEye);
  }

  const vars: Vars = {
    "--stage-scale": stageScale,
    "--stage-y": `${stageY}px`,

    "--body-brightness": bodyBrightness,
    "--rail-opacity": railOpacity,

    "--rail-offset": `${lerp(
      100,
      -8,
      awaken,
    )}`,

    "--particle-opacity": particleOpacity,
    "--particle-offset": `${-time * 0.05}`,

    "--beam-opacity": beamOpacity,
    "--beam-offset": `${lerp(
      100,
      -85,
      flow,
    )}`,

    "--exchange-opacity": exchange,
    "--left-wing-x": `${-wingDistance}px`,
    "--right-wing-x": `${wingDistance}px`,

    "--impact": impact,

    "--identity-opacity": identity,
    "--notes-opacity": notesReveal,
    "--horizon-opacity": horizon,

    "--eye-open": eyeOpen,
    "--eye-open-scale": 0.05 + eyeOpen * 0.95,
    "--eye-cover-opacity": 1 - eyeOpen,

    "--pupil-x": `${pupilX}px`,
    "--pupil-y": `${pupilY}px`,
  };

  return (
    <div
      className={`${styles.launch} ${
        reviewMode ? styles.reviewMode : ""
      }`}
      style={vars}
      role="status"
      aria-label="Exchange Notes cinematic opening"
    >
      <div className={styles.ambientBloom} />
      <div className={styles.impactBloom} />
      <div className={styles.grain} />
      <div className={styles.vignette} />

      <div className={styles.stage}>
        <svg
          className={styles.exchangeField}
          viewBox="0 0 400 400"
          aria-hidden="true"
        >
          <defs>
            <filter
              id="v4-soft-blur"
              x="-100%"
              y="-100%"
              width="300%"
              height="300%"
            >
              <feGaussianBlur stdDeviation="8" />
            </filter>

            <linearGradient
              id="v4-wing-metal"
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop
                offset="0"
                stopColor="#3c424b"
              />
              <stop
                offset="0.48"
                stopColor="#868d98"
              />
              <stop
                offset="0.53"
                stopColor="#e7eaf0"
              />
              <stop
                offset="0.58"
                stopColor="#737a84"
              />
              <stop
                offset="1"
                stopColor="#20242a"
              />
            </linearGradient>
          </defs>

          <g className={styles.leftSystem}>
            <path
              className={styles.wingBloom}
              d="M 82 36 Q -86 58 -93 180 Q -86 302 82 324"
            />

            <path
              className={styles.wingBody}
              d="M 82 36 Q -86 58 -93 180 Q -86 302 82 324"
            />

            <path
              className={styles.wingSpec}
              d="M 82 36 Q -86 58 -93 180 Q -86 302 82 324"
            />
          </g>

          <g className={styles.rightSystem}>
            <path
              className={styles.wingBloom}
              d="M 318 36 Q 486 58 493 180 Q 486 302 318 324"
            />

            <path
              className={styles.wingBody}
              d="M 318 36 Q 486 58 493 180 Q 486 302 318 324"
            />

            <path
              className={styles.wingSpec}
              d="M 318 36 Q 486 58 493 180 Q 486 302 318 324"
            />
          </g>

          <g className={styles.exchangeArrows}>
            <path d="M 181 180 H 238" />
            <path d="M 193 166 L 179 180 L 193 194" />

            <path d="M 332 180 H 379" />
            <path d="M 365 166 L 381 180 L 365 194" />
          </g>
        </svg>

        <ExchangeNotesMark
          className={styles.canonicalMark}
          surfaceColor="#f5f3ed"
          highlightColor="#ffffff"
          withTile={false}
          cosmic={false}
          energy={0}
        />

        <svg
          className={styles.energyField}
          viewBox="0 0 400 400"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="v4-energy"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop
                offset="0"
                stopColor="#8994a4"
                stopOpacity="0"
              />
              <stop
                offset="0.45"
                stopColor="#e4e8ef"
              />
              <stop
                offset="0.75"
                stopColor="#ffffff"
              />
              <stop
                offset="1"
                stopColor="#cbd4e1"
                stopOpacity="0"
              />
            </linearGradient>

            <radialGradient id="v4-core-halo">
              <stop
                offset="0"
                stopColor="#ffffff"
                stopOpacity="0.82"
              />
              <stop
                offset="0.28"
                stopColor="#dfe6ef"
                stopOpacity="0.24"
              />
              <stop
                offset="1"
                stopColor="#bcc9da"
                stopOpacity="0"
              />
            </radialGradient>
          </defs>

          <path
            className={styles.railUnderGlow}
            pathLength="100"
            d="M 300 70 Q 110 70 100 180 Q 110 320 300 320"
          />

          <path
            className={styles.railSpecular}
            pathLength="100"
            d="M 300 70 Q 110 70 100 180 Q 110 320 300 320"
          />

          <path
            className={styles.railParticles}
            pathLength="100"
            d="M 300 70 Q 110 70 100 180 Q 110 320 300 320"
          />

          <g className={styles.railNodes}>
            <circle cx="272" cy="72" r="2.4" />
            <circle cx="210" cy="82" r="2.0" />
            <circle cx="151" cy="112" r="2.1" />
            <circle cx="111" cy="157" r="2.6" />
            <circle cx="108" cy="218" r="2.0" />
            <circle cx="146" cy="276" r="2.2" />
            <circle cx="211" cy="310" r="2.1" />
            <circle cx="275" cy="319" r="2.5" />
          </g>

          <path
            className={styles.beamBloom}
            pathLength="100"
            d="M -140 180 L 285 180"
          />

          <path
            className={styles.beamCore}
            pathLength="100"
            d="M -140 180 L 285 180"
          />

          <circle
            className={styles.coreHalo}
            cx="285"
            cy="180"
            r="82"
            fill="url(#v4-core-halo)"
          />

          <circle
            className={styles.impactRing}
            cx="285"
            cy="180"
            r="54"
          />

          <g className={styles.eyeCover}>
            <ellipse
              className={styles.sealedLens}
              cx="285"
              cy="180"
              rx="41"
              ry="41"
            />

            <path
              className={styles.sealedSeam}
              d="M 255 180 Q 285 176 315 180"
            />
          </g>

          <g className={styles.finalEye}>
            <circle
              className={styles.eyeShell}
              cx="285"
              cy="180"
              r="39"
            />

            <g className={styles.pupilGroup}>
              <circle
                className={styles.eyeIris}
                cx="298"
                cy="173"
                r="13"
              />

              <circle
                className={styles.eyePupil}
                cx="298"
                cy="173"
                r="8"
              />

              <circle
                className={styles.eyeCatchlight}
                cx="302"
                cy="169"
                r="3.6"
              />
            </g>
          </g>
        </svg>
      </div>

      <div className={styles.identity}>
        <div className={styles.exchangeWord}>
          EXCHANGE
        </div>

        <div className={styles.notesWord}>
          NOTES
        </div>
      </div>

      <div className={styles.horizon}>
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
            <span>
              {(time / 1000).toFixed(3)}s
            </span>

            <button
              type="button"
              onClick={togglePlay}
            >
              {playing ? "Pause" : "Play"}
            </button>

            <button
              type="button"
              onClick={replay}
            >
              Replay
            </button>
          </div>

          <input
            className={styles.scrubber}
            type="range"
            min="0"
            max={DURATION}
            step="10"
            value={time}
            onChange={(event) =>
              seek(Number(event.target.value))
            }
            aria-label="Animation timeline"
          />

          <div className={styles.checkpoints}>
            {[
              [500, "0.50"],
              [1000, "1.00"],
              [1480, "1.48"],
              [2100, "2.10"],
              [2780, "2.78"],
              [3000, "3.00"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => seek(Number(value))}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
