"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Bodoni_Moda } from "next/font/google";

import styles from "./ExchangeNotesLaunchV8.module.css";

type Props = {
  reviewMode?: boolean;
  onComplete?: () => void;
};

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const v8Serif = Bodoni_Moda({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-v8-serif",
});

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

const cinematicPulse = (
  time: number,
  start: number,
  end: number,
) => {
  const t = phase(time, start, end);
  const s = Math.sin(Math.PI * t);

  return s * s;
};

export default function ExchangeNotesLaunchV8({
  reviewMode = false,
  onComplete,
}: Props) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);

  const frameRef = useRef(0);
  const startRef = useRef(0);
  const timeRef = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(frameRef.current);
      return;
    }

    startRef.current = performance.now() - timeRef.current;

    const tick = (now: number) => {
      const next = Math.min(DURATION, now - startRef.current);

      timeRef.current = next;
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
    timeRef.current = 0;
    setTime(0);
    setPlaying(true);
  }, []);

  const togglePlay = useCallback(() => {
    if (timeRef.current >= DURATION) {
      completedRef.current = false;
      timeRef.current = 0;
      setTime(0);
      setPlaying(true);
      return;
    }

    setPlaying((value) => !value);
  }, []);

  const seek = useCallback((value: number) => {
    const next = clamp(value, 0, DURATION);

    timeRef.current = next;
    setPlaying(false);
    setTime(next);
  }, []);

  /*
    V8 — ORBITAL COUTURE

    0.00–0.24  Silence / acquisition
    0.24–0.82  Material discovery
    0.82–1.23  Magnetic precision lock
    1.23–1.68  Exchange event
    1.68–2.24  Cinematic camera reveal
    2.24–2.58  Brand title resolves
    2.60–2.81  Yumi eye awakens
    2.76–2.91  Focus acquisition
    2.91–3.00  Conscious hold
  */

  const seed = smooth(
    phase(time, 180, 420),
  );

  const upper = smooth(
    phase(time, 250, 740),
  );

  const lower = smooth(
    phase(time, 330, 820),
  );

  const connector = easeOut(
    phase(time, 820, 1230),
  );

  const ring = smooth(
    phase(time, 950, 1280),
  );

  const exchangeIn = easeOut(
    phase(time, 1230, 1410),
  );

  const exchangeOut =
    1 -
    smooth(
      phase(time, 1500, 1680),
    );

  const exchange =
    clamp(exchangeIn * exchangeOut);

  const settle = smooth(
    phase(time, 1680, 2240),
  );

  const identity = smooth(
    phase(time, 2240, 2480),
  );

  const notesReveal = smooth(
    phase(time, 2320, 2580),
  );

  const horizon = smooth(
    phase(time, 2380, 2820),
  );

  const eyeOpen = smooth(
    phase(time, 2600, 2810),
  );

  const focusLock = smooth(
    phase(time, 2760, 2910),
  );

  const materialArrival =
    cinematicPulse(
      time,
      560,
      900,
    );

  const lockPulse =
    cinematicPulse(
      time,
      1120,
      1320,
    );

  const spaceProgress = smooth(
    phase(time, 0, DURATION),
  );

  const spaceReveal = smooth(
    phase(time, 0, 560),
  );

  const impact = smooth(
    bell(time, 1460, 90),
  );

  const materialSweep = smooth(
    phase(time, 280, 1120),
  );

  const materialSweepOpacity =
    clamp(
      cinematicPulse(
        time,
        280,
        1180,
      ) * 0.92,
    );

  const connectorResponse = smooth(
    bell(time, 1230, 86),
  );

  const eyeResponse = smooth(
    bell(time, 2810, 145),
  );

  const calibrationOpacity =
    1 -
    smooth(
      phase(time, 1840, 2140),
    );

  const radar = clamp(
    smooth(phase(time, 180, 2400)) * (1 - eyeOpen * 0.12),
  );

  const radarRotate = lerp(
    -38,
    232,
    smooth(phase(time, 180, 2320)),
  );

  const scanLeft = lerp(
    -160,
    60,
    smooth(phase(time, 680, 1680)),
  );

  const scanRight = lerp(
    160,
    -60,
    smooth(phase(time, 940, 1860)),
  );

  const detector = clamp(
    exchange * 0.92 + settle * 0.30 + identity * 0.22,
  );

  const stageScale =
    time < 1640
      ? lerp(0.965, 1, seed)
      : lerp(1, 0.765, settle);

  const stageY =
    time < 1640
      ? 0
      : lerp(0, -54, settle);

  const upperX =
    lerp(-44, 0, upper) +
    materialArrival * 1.45;

  const upperY =
    lerp(-31, 0, upper) -
    materialArrival * 0.85;

  const upperR =
    lerp(-12, 0, upper) +
    materialArrival * 0.5;

  const seedTraceOpacity =
    seed *
    (
      1 -
      smooth(
        phase(time, 420, 680),
      )
    );

  const signalNodeOpacity =
    seed *
    (
      1 -
      smooth(
        phase(time, 500, 760),
      )
    );

  const lowerX =
    lerp(44, 0, lower) -
    materialArrival * 1.35;

  const lowerY =
    lerp(32, 0, lower) +
    materialArrival * 0.8;

  const lowerR =
    lerp(12, 0, lower) -
    materialArrival * 0.48;

  const railOpacity = clamp(
    smooth(
      phase(time, 260, 1040),
    ) *
      (
        1 -
        smooth(
          phase(time, 1700, 2240),
        ) * 0.52
      ),
  );

  const connectorGlow = clamp(
    connector * (1 - eyeOpen * 0.15),
  );

  const housingOpacity = clamp(
    ring * (1 - eyeOpen * 0.08),
  );

  const darkLensOpacity = clamp(1 - eyeOpen * 1.05);
  const finalEyeOpacity = eyeOpen;

  let pupilX = -3.0;
  let pupilY = 1.0;

  if (eyeOpen > 0.16) {
    const acquire = smooth(
      phase(time, 2680, 2820),
    );

    pupilX = lerp(
      -3.0,
      1.45,
      acquire,
    );

    pupilY = lerp(
      1.0,
      -0.4,
      acquire,
    );
  }

  pupilX = lerp(
    pupilX,
    0,
    focusLock,
  );

  pupilY = lerp(
    pupilY,
    0,
    focusLock,
  );

  const pupilScale =
    lerp(
      1.05,
      0.92,
      focusLock,
    );

  const vars: Vars = {
    "--stage-scale": stageScale,
    "--stage-y": `${stageY}px`,

    "--space-opacity": spaceReveal,
    "--space-x":
      `${lerp(-5, 5, spaceProgress)}px`,
    "--space-y":
      `${lerp(3, -3, spaceProgress)}px`,
    "--space-rotate":
      `${lerp(-2.2, 2.2, spaceProgress)}deg`,

    "--lock-pulse": lockPulse,
    "--focus-lock": focusLock,

    "--radar-opacity": radar,
    "--radar-rotate": `${radarRotate}deg`,
    "--scan-left-x": `${scanLeft}px`,
    "--scan-right-x": `${scanRight}px`,
    "--detector-opacity": detector,

    "--seed": seed,
    "--seed-trace-opacity": seedTraceOpacity,
    "--signal-node-opacity": signalNodeOpacity,
    "--upper-opacity": upper,
    "--upper-x": `${upperX}px`,
    "--upper-y": `${upperY}px`,
    "--upper-r": `${upperR}deg`,

    "--lower-opacity": lower,
    "--lower-x": `${lowerX}px`,
    "--lower-y": `${lowerY}px`,
    "--lower-r": `${lowerR}deg`,

    "--connector-opacity": connector,
    "--connector-glow": connectorGlow,
    "--connector-scale": 0.07 + connector * 0.77,

    "--ring-opacity": housingOpacity,
    "--ring-scale": 0.72 + ring * 0.28,

    "--exchange-opacity": exchange,
    "--impact": impact,

    "--material-sweep-offset": lerp(
      118,
      -26,
      materialSweep,
    ),

    "--material-sweep-opacity":
      materialSweepOpacity,

    "--connector-response":
      connectorResponse,

    "--eye-response":
      eyeResponse,

    "--calibration-opacity":
      calibrationOpacity,

    "--rail-opacity": railOpacity,
    "--rail-offset": `${lerp(100, -15, smooth(phase(time, 280, 1700)))}`,
    "--particle-offset": `${-time * 0.045}`,

    "--dark-lens-opacity": darkLensOpacity,
    "--final-eye-opacity": finalEyeOpacity,
    "--eye-open-scale-y": 0.04 + eyeOpen * 0.96,
    "--eye-open-scale-x": 0.92 + eyeOpen * 0.08,

    "--pupil-x": `${pupilX}px`,
    "--pupil-y": `${pupilY}px`,
    "--pupil-scale": pupilScale,

    "--identity-opacity": identity,
    "--notes-opacity": notesReveal,
    "--horizon-opacity": horizon,
  };

  return (
    <div
      className={`${styles.launch} ${v8Serif.variable} ${reviewMode ? styles.reviewMode : ""}`}
      style={vars}
      role="status"
      aria-label="Exchange Notes assembly opening"
    >
      <div
        className={styles.v8Space}
        aria-hidden="true"
      >
        <div className={styles.v8Stars} />
        <div className={styles.v8OrbitA} />
        <div className={styles.v8OrbitB} />
        <div className={styles.v8Sweep} />
      </div>

      <div className={styles.ambientBloom} />
      <div className={styles.exchangeBloom} />
      <div className={styles.grain} />
      <div className={styles.vignette} />

      <div className={styles.radarBackground} aria-hidden="true">
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

      <div className={styles.cinematicDepth} aria-hidden="true">
        <div className={styles.searchlightA} />
        <div className={styles.searchlightB} />
      </div>

      <div className={styles.stage}>
        <svg
          className={styles.scene}
          viewBox="0 0 400 400"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="v5-body-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#0b0e13" />
              <stop offset="0.48" stopColor="#29303a" />
              <stop offset="0.52" stopColor="#7b8592" />
              <stop offset="1" stopColor="#030407" />
            </linearGradient>

            <linearGradient id="v5-bar-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#8c939d" />
              <stop offset="0.48" stopColor="#f0f1f2" />
              <stop offset="0.7" stopColor="#bcc2cb" />
              <stop offset="1" stopColor="#5f6670" />
            </linearGradient>

            <radialGradient id="v5-core-halo">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.92" />
              <stop offset="0.28" stopColor="#dfe6ef" stopOpacity="0.18" />
              <stop offset="1" stopColor="#bcc9da" stopOpacity="0" />
            </radialGradient>
          </defs>

          <path
            className={styles.seedTrace}
            d="M 137 132 Q 143 112 154 102"
            pathLength="100"
          />

          <circle className={styles.signalNode} cx="154" cy="102" r="4.7" />

          <g className={styles.upperGroup}>
            <path
              className={styles.arcBloom}
              d="M 300 74 Q 122 74 106 180"
            />
            <path
              className={styles.arcBody}
              d="M 300 74 Q 122 74 106 180"
            />
            <path
              className={styles.arcSpec}
              d="M 286 86 Q 135 86 119 180"
            />

            <path
              className={styles.materialSweepUpper}
              pathLength="100"
              d="M 286 86 Q 135 86 119 180"
            />
          </g>

          <g className={styles.lowerGroup}>
            <path
              className={styles.arcBloom}
              d="M 106 180 Q 122 286 300 286"
            />
            <path
              className={styles.arcBody}
              d="M 106 180 Q 122 286 300 286"
            />
            <path
              className={styles.arcSpec}
              d="M 119 180 Q 135 274 286 274"
            />

            <path
              className={styles.materialSweepLower}
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
              fill="url(#v5-core-halo)"
            />
            <circle
              className={styles.eyeRing}
              cx="286"
              cy="180"
              r="31"
            />

            <circle
              className={styles.darkLens}
              cx="286"
              cy="180"
              r="22"
            />

            <g className={styles.finalEye}>
              <circle
                className={styles.eyeWhite}
                cx="286"
                cy="180"
                r="22"
              />

              <circle
                className={styles.eyeGlass}
                cx="286"
                cy="180"
                r="20.2"
              />

              <g className={styles.pupilGroup}>
                <circle
                  className={styles.eyeIris}
                  cx="298"
                  cy="173"
                  r="9.4"
                />
                <circle
                  className={styles.eyePupil}
                  cx="298"
                  cy="173"
                  r="5.2"
                />
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
            <g className={styles.leftExchange}>
              <path
                className={styles.exchangeWing}
                d="M 92 66 Q -28 88 -36 180 Q -28 272 92 294"
              />
            </g>

            <g className={styles.rightExchange}>
              <path
                className={styles.exchangeWing}
                d="M 308 66 Q 428 88 436 180 Q 428 272 308 294"
              />
            </g>

            <g className={styles.exchangeArrows}>
              <path d="M 212 180 H 238" />
              <path d="M 222 170 L 212 180 L 222 190" />

              <path d="M 318 180 H 344" />
              <path d="M 334 170 L 344 180 L 334 190" />
            </g>

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
            <span>{(time / 1000).toFixed(3)}s</span>

            <button type="button" onClick={togglePlay}>
              {playing ? "Pause" : "Play"}
            </button>

            <button type="button" onClick={replay}>
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
            onChange={(event) => seek(Number(event.target.value))}
            aria-label="Animation timeline"
          />

          <div className={styles.checkpoints}>
            {[
              [240, "0.24"],
              [820, "0.82"],
              [1230, "1.23"],
              [1460, "1.46"],
              [1680, "1.68"],
              [2240, "2.24"],
              [2600, "2.60"],
              [2810, "2.81"],
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
