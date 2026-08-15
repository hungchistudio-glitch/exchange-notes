/**
 * The launch animation's timeline, as a pure function of elapsed time.
 *
 * Deliberately free of React and of the DOM: `computeFrame` takes a
 * millisecond offset and returns the CSS custom properties for that instant,
 * so the whole opening can be reasoned about, retimed, or scrubbed without
 * rendering anything. The component is then just a loop that hands the result
 * to `style.setProperty`.
 *
 * Every phase below is a named constant rather than a literal buried in an
 * expression. The previous version scattered the same numbers across a dozen
 * call sites, which is why retiming it meant hunting for `2880` by hand.
 */

export const LAUNCH_DURATION_MS = 2500;

/* ---------------------------------------------------------------
   Phases, in milliseconds from first frame.
   --------------------------------------------------------------- */

const PHASE = {
  /* Assembly — the two arcs arrive and the connector locks them together. */
  signal: [120, 300],
  upper: [180, 620],
  lower: [240, 690],
  connector: [600, 900],
  ring: [690, 940],

  /* Material light travelling along the body while it assembles. */
  rail: [180, 1120],
  materialSweep: [180, 740],
  materialSweepPulse: [180, 780],

  /* The exchange event: two halves meet, one bright impact. */
  exchangeIn: [900, 1010],
  exchangeOut: [1060, 1160],
  lockPulse: [740, 880],

  /* The camera pulls back and the world settles into its final frame. */
  settle: [1120, 1520],

  /* Identity and eye resolve together. */
  eyeOpen: [1440, 1720],
  identity: [1450, 1760],
  horizon: [1560, 1900],
  stillness: [1980, 2160],

  /* Yumi's single deliberate look. */
  gazeOut: [1780, 1990],
  gazeHold: [1990, 2090],
  gazeBack: [2090, 2300],
  focusLock: [2300, 2440],
} as const;

/* The impact flash is a bell rather than a phase: it peaks and decays. */
const IMPACT_CENTRE = 1030;
const IMPACT_RADIUS = 70;

/* The eye-awakening glow that spills onto the horizon and the depth layer. */
const EYE_RESPONSE_CENTRE = 1700;
const EYE_RESPONSE_RADIUS = 190;

/* The connector's flex when it seats into the body. */
const CONNECTOR_RESPONSE_CENTRE = 900;
const CONNECTOR_RESPONSE_RADIUS = 60;

/*
 * The optical core sweep — V9's signature move. A single luminous hotspot
 * crosses the whole mark, but slows to a crawl while it passes through the
 * eye, then resumes. Three segments rather than one eased curve, because the
 * slow-down has to land on the eye specifically, not on a percentage.
 */
const CORE_SWEEP = {
  approach: [900, 1050],
  throughEye: [1050, 1330],
  exit: [1330, 1560],
  fadeIn: [900, 1010],
  fadeOut: [1330, 1560],
  /* Fraction of the travel consumed by each segment. */
  atEyeEntry: 0.42,
  atEyeExit: 0.64,
  /* Background-position, in percent, at the start and end of the travel. */
  from: 120,
  to: -65,
} as const;

/* Pupil rest and gaze positions, in SVG user units. */
const GAZE: Record<"centre" | "out", { x: number; y: number }> = {
  centre: { x: -12, y: 7.0 },
  out: { x: -18.4, y: 7.45 },
};

/* ---------------------------------------------------------------
   Easing
   --------------------------------------------------------------- */

export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

/** Normalised progress through a window, clamped at both ends. */
const phase = (time: number, [start, end]: readonly [number, number]) =>
  clamp((time - start) / (end - start));

/** Hermite smoothstep — the workhorse ease for arrivals. */
const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

/**
 * Smootherstep. Zero first *and* second derivative at both ends, so motion
 * that uses it has no perceptible corner where it starts or stops — which is
 * what makes the core sweep read as a camera move rather than a transition.
 */
const smoother = (value: number) => {
  const t = clamp(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

const easeOut = (value: number) => 1 - Math.pow(1 - clamp(value), 3);

const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t);

/** A triangular falloff around `centre`, reaching 0 at `radius`. */
const bell = (time: number, centre: number, radius: number) =>
  clamp(1 - Math.abs(time - centre) / radius);

/** A half-sine lobe over a window: rises, peaks mid-way, falls back to 0. */
const pulse = (time: number, window: readonly [number, number]) => {
  const s = Math.sin(Math.PI * phase(time, window));
  return s * s;
};

/**
 * Formats a number for CSS, trimmed to a precision the screen can actually
 * resolve.
 *
 * This is a performance decision as much as a tidiness one: the component
 * only writes properties whose value changed, and full float precision means
 * a slowly-drifting value like the starfield's parallax produces a different
 * string on literally every frame. Rounded, it holds steady for several
 * frames at a time and stops invalidating style for the whole scene.
 */
const n = (value: number, digits = 3) => {
  const factor = 10 ** digits;
  return `${Math.round(value * factor) / factor}`;
};

/* ---------------------------------------------------------------
   Frame
   --------------------------------------------------------------- */

export type LaunchFrame = Record<string, string>;

/**
 * The CSS custom properties for `time` milliseconds into the launch.
 *
 * Only properties the stylesheet actually consumes are returned. Several
 * values the previous version computed every frame — the radar's opacity and
 * rotation, the detector scan offsets — are gone: those elements are driven
 * by their own infinite CSS animations, which win over a custom property on
 * the same declaration, so computing them was pure waste.
 */
export function computeFrame(time: number): LaunchFrame {
  const t = clamp(time, 0, LAUNCH_DURATION_MS);

  /* --- assembly --------------------------------------------------- */

  const seed = smooth(phase(t, PHASE.signal));
  const upper = smooth(phase(t, PHASE.upper));
  const lower = smooth(phase(t, PHASE.lower));
  const connector = easeOut(phase(t, PHASE.connector));
  const ring = smooth(phase(t, PHASE.ring));

  /* A short overshoot as each arc lands, so they arrive with weight. */
  const arrival = pulse(t, PHASE.materialSweepPulse);

  /* --- exchange event --------------------------------------------- */

  const exchange = clamp(
    easeOut(phase(t, PHASE.exchangeIn)) *
      (1 - smooth(phase(t, PHASE.exchangeOut))),
  );

  const impact = smooth(bell(t, IMPACT_CENTRE, IMPACT_RADIUS));

  /* --- camera settle ---------------------------------------------- */

  const settle = smooth(phase(t, PHASE.settle));

  /* --- identity and eye ------------------------------------------- */

  const eyeOpen = smooth(phase(t, PHASE.eyeOpen));
  const identity = smooth(phase(t, PHASE.identity));
  const horizon = smooth(phase(t, PHASE.horizon));
  const stillness = smooth(phase(t, PHASE.stillness));
  const focusLock = smooth(phase(t, PHASE.focusLock));

  /* --- gaze --------------------------------------------------------
   *
   * Out, hold, back. The hold is the point: a look that travels straight
   * back to centre reads as a UI transition, and a look that pauses at the
   * end of its travel reads as a decision.
   */
  let pupilX = GAZE.centre.x;
  let pupilY = GAZE.centre.y;

  if (t >= PHASE.gazeOut[0] && t < PHASE.gazeHold[0]) {
    const k = smooth(phase(t, PHASE.gazeOut));
    pupilX = lerp(GAZE.centre.x, GAZE.out.x, k);
    pupilY = lerp(GAZE.centre.y, GAZE.out.y, k);
  } else if (t >= PHASE.gazeHold[0] && t < PHASE.gazeBack[0]) {
    pupilX = GAZE.out.x;
    pupilY = GAZE.out.y;
  } else if (t >= PHASE.gazeBack[0]) {
    const k = smooth(phase(t, PHASE.gazeBack));
    pupilX = lerp(GAZE.out.x, GAZE.centre.x, k);
    pupilY = lerp(GAZE.out.y, GAZE.centre.y, k);
  }

  /* --- optical core sweep ------------------------------------------ */

  let sweep: number;

  if (t < CORE_SWEEP.throughEye[0]) {
    sweep = lerp(0, CORE_SWEEP.atEyeEntry, smoother(phase(t, CORE_SWEEP.approach)));
  } else if (t < CORE_SWEEP.exit[0]) {
    sweep = lerp(
      CORE_SWEEP.atEyeEntry,
      CORE_SWEEP.atEyeExit,
      smoother(phase(t, CORE_SWEEP.throughEye)),
    );
  } else {
    sweep = lerp(CORE_SWEEP.atEyeExit, 1, smoother(phase(t, CORE_SWEEP.exit)));
  }

  const sweepOpacity = clamp(
    smoother(phase(t, CORE_SWEEP.fadeIn)) *
      (1 - smoother(phase(t, CORE_SWEEP.fadeOut))),
  );

  /* --- stage framing ------------------------------------------------
   *
   * Before the exchange the mark drifts forward a hair; after it, the camera
   * pulls back and lifts so the wordmark has room to resolve underneath.
   */
  const settling = t >= PHASE.exchangeOut[0];

  const stageScale = settling ? lerp(1, 0.765, settle) : lerp(0.965, 1, seed);
  const stageY = settling ? lerp(0, -54, settle) : 0;

  /* --- environment --------------------------------------------------- */

  const spaceProgress = smooth(phase(t, [0, LAUNCH_DURATION_MS]));

  return {
    "--stage-scale": n(stageScale),
    "--stage-y": `${n(stageY, 2)}px`,

    "--space-opacity": n(smooth(phase(t, [0, 380]))),
    "--space-x": `${n(lerp(-5, 5, spaceProgress), 2)}px`,
    "--space-y": `${n(lerp(3, -3, spaceProgress), 2)}px`,
    "--space-rotate": `${n(lerp(-2.2, 2.2, spaceProgress), 2)}deg`,

    "--signal-node-opacity": n(seed * (1 - smooth(phase(t, [300, 500])))),

    "--upper-opacity": n(upper),
    "--upper-x": `${n(lerp(-44, 0, upper) + arrival * 1.45, 2)}px`,
    "--upper-y": `${n(lerp(-31, 0, upper) - arrival * 0.85, 2)}px`,
    "--upper-r": `${n(lerp(-12, 0, upper) + arrival * 0.5, 2)}deg`,

    "--lower-opacity": n(lower),
    "--lower-x": `${n(lerp(44, 0, lower) - arrival * 1.35, 2)}px`,
    "--lower-y": `${n(lerp(32, 0, lower) + arrival * 0.8, 2)}px`,
    "--lower-r": `${n(lerp(12, 0, lower) - arrival * 0.48, 2)}deg`,

    "--rail-opacity": n(clamp(smooth(phase(t, PHASE.rail)) * (1 - settle * 0.52))),
    "--rail-offset": n(lerp(100, -15, smooth(phase(t, PHASE.rail))), 2),
    "--particle-offset": n(-t * 0.045, 2),

    "--material-sweep-offset": n(
      lerp(118, -26, smooth(phase(t, PHASE.materialSweep))),
      2,
    ),
    "--material-sweep-opacity": n(
      clamp(pulse(t, PHASE.materialSweepPulse) * 0.92),
    ),

    "--connector-opacity": n(connector),
    "--connector-glow": n(clamp(connector * (1 - eyeOpen * 0.15))),
    "--connector-scale": n(0.07 + connector * 0.77),
    "--connector-response": n(
      smooth(bell(t, CONNECTOR_RESPONSE_CENTRE, CONNECTOR_RESPONSE_RADIUS)),
    ),
    "--lock-pulse": n(pulse(t, PHASE.lockPulse)),

    "--ring-opacity": n(clamp(ring * (1 - eyeOpen * 0.08))),
    "--ring-scale": n(0.72 + ring * 0.28),

    "--exchange-opacity": n(exchange),
    "--impact": n(impact),

    "--core-sweep-opacity": n(sweepOpacity),
    "--core-sweep-position": `${n(lerp(CORE_SWEEP.from, CORE_SWEEP.to, sweep), 2)}%`,

    "--dark-lens-opacity": n(clamp(1 - eyeOpen * 1.05)),
    "--final-eye-opacity": n(eyeOpen),
    "--eye-open-scale-y": n(0.04 + eyeOpen * 0.96),
    "--eye-open-scale-x": n(0.92 + eyeOpen * 0.08),
    "--eye-response": n(smooth(bell(t, EYE_RESPONSE_CENTRE, EYE_RESPONSE_RADIUS))),
    "--eye-breath": n(
      1 + pulse(t, [PHASE.gazeOut[0], PHASE.focusLock[1]]) * 0.004,
      4,
    ),

    "--pupil-x": `${n(pupilX, 2)}px`,
    "--pupil-y": `${n(pupilY, 2)}px`,
    "--pupil-scale": n(lerp(1.018, 0.985, focusLock)),
    "--focus-lock": n(focusLock),

    "--identity-opacity": n(identity),
    "--horizon-opacity": n(horizon),
    "--calibration-opacity": n(1 - smooth(phase(t, [1240, 1540]))),
    "--final-stillness": n(stillness),
  };
}

/** Scrub targets for the review harness. */
export const CHECKPOINTS: ReadonlyArray<readonly [number, string]> = [
  [0, "0.00"],
  [300, "0.30"],
  [620, "0.62"],
  [900, "0.90"],
  [1030, "1.03"],
  [1330, "1.33"],
  [1520, "1.52"],
  [1720, "1.72"],
  [1990, "1.99"],
  [2300, "2.30"],
  [2500, "2.50"],
];
