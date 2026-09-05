/**
 * Exchange Notes — Yumi Minimal Opening.
 *
 * The animation is deliberately expressed as a pure function of elapsed
 * time. The renderer can therefore scrub it, replay it, or switch to the
 * reduced-motion cut without asking React to render on every frame.
 */

export const YUMI_MINIMAL_DURATION_MS = 2800;
export const YUMI_MINIMAL_REDUCED_DURATION_MS = 820;
export const YUMI_MINIMAL_SNAP_MS = 1820;

export const YUMI_MINIMAL_CHECKPOINTS = [
  [0, "White"],
  [300, "Enter"],
  [850, "Look left"],
  [1000, "Look right"],
  [1150, "Anticipate"],
  [1250, "Stretch"],
  [1650, "Maximum"],
  [YUMI_MINIMAL_SNAP_MS, "Snap + name"],
  [2230, "Blink"],
  [2550, "Handoff"],
  [YUMI_MINIMAL_DURATION_MS, "App"],
] as const;

export type YumiMinimalFrame = Record<string, string>;

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const phase = (time: number, start: number, end: number) =>
  clamp((time - start) / (end - start));

const lerp = (from: number, to: number, progress: number) =>
  from + (to - from) * clamp(progress);

const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

const smoother = (value: number) => {
  const t = clamp(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

const easeOut = (value: number) => 1 - Math.pow(1 - clamp(value), 3);

const number = (value: number, digits = 4) => {
  const factor = 10 ** digits;
  return `${Math.round(value * factor) / factor}`;
};

type Stop = readonly [time: number, value: number];

/** Smoothly samples a short list of authored motion poses. */
function sample(time: number, stops: readonly Stop[]) {
  if (time <= stops[0][0]) return stops[0][1];

  for (let index = 1; index < stops.length; index += 1) {
    const [endTime, endValue] = stops[index];
    const [startTime, startValue] = stops[index - 1];

    if (time <= endTime) {
      return lerp(
        startValue,
        endValue,
        smooth(phase(time, startTime, endTime)),
      );
    }
  }

  return stops[stops.length - 1][1];
}

/**
 * A deterministic under-damped spring returning from 1 to 0.
 *
 * It crosses its resting point at 128ms, which is why the recoil starts at
 * 1692ms and the signature reveal lands at 1820ms. The small negative tail is
 * the physical overshoot, not an ease-in-out approximation.
 */
function springToRest(elapsedMs: number) {
  const seconds = Math.max(0, elapsedMs) / 1000;
  const damping = 16;
  const frequency = 18;

  return (
    Math.exp(-damping * seconds) *
    (Math.cos(frequency * seconds) +
      (damping / frequency) * Math.sin(frequency * seconds))
  );
}

/** The body's smaller reaction-force spring after the core snaps home. */
function reactionSpring(elapsedMs: number) {
  const seconds = Math.max(0, elapsedMs) / 1000;
  return Math.exp(-11 * seconds) * Math.cos(21 * seconds);
}

function blinkAt(time: number, start: number, peak: number, end: number) {
  if (time <= start || time >= end) return 0;
  if (time <= peak) return smoother(phase(time, start, peak));
  return 1 - smoother(phase(time, peak, end));
}

function reducedFrame(time: number): YumiMinimalFrame {
  const t = clamp(time, 0, YUMI_MINIMAL_REDUCED_DURATION_MS);
  const arrive = smoother(phase(t, 90, 290));
  const wordmark = smoother(phase(t, 390, 560));
  const blink = blinkAt(t, 300, 350, 420);
  const handoff = smoother(phase(t, 650, YUMI_MINIMAL_REDUCED_DURATION_MS));

  return {
    "--actor-x": "0vw",
    "--actor-y": `${number(lerp(5, 0, arrive), 2)}px`,
    "--actor-shift-x": "0px",
    "--actor-rotation": "0deg",
    "--actor-opacity": number(arrive),
    "--body-scale-x": number(lerp(0.96, 1, arrive)),
    "--body-scale-y": number(lerp(0.96, 1, arrive)),
    "--stretch": "0",
    "--eye-x": "0%",
    "--bridge-scale": "1",
    "--pupil-x": "0px",
    "--pupil-y": "0px",
    "--blink": number(blink),
    "--wordmark-opacity": number(wordmark),
    "--wordmark-y": `${number(lerp(4, 0, wordmark), 2)}px`,
    "--scene-opacity": number(1 - handoff),
    "--scene-exit-y": `${number(-6 * handoff, 2)}px`,
    "--handoff-opacity": number(handoff),
    "--handoff-y": `${number(lerp(8, 0, handoff), 2)}px`,
  };
}

export function computeYumiMinimalFrame(
  time: number,
  reducedMotion = false,
): YumiMinimalFrame {
  if (reducedMotion) return reducedFrame(time);

  const t = clamp(time, 0, YUMI_MINIMAL_DURATION_MS);

  /* The jump is translation plus authored squash, never layout movement. */
  const actorX = sample(t, [
    [0, 58],
    [300, 58],
    [405, 45],
    [530, 20],
    [650, 2.2],
    [700, -1.4],
    [750, 0],
  ]);
  const actorY = sample(t, [
    [0, -4],
    [300, -4],
    [430, -28],
    [560, -38],
    [650, 4],
    [690, 9],
    [750, 0],
  ]);

  let bodyScaleX = sample(t, [
    [0, 0.9],
    [300, 0.9],
    [520, 0.97],
    [650, 1.1],
    [690, 0.96],
    [750, 1],
    [1150, 1],
    [1240, 0.955],
    [1550, 1.025],
    [1692, 1.015],
  ]);
  let bodyScaleY = sample(t, [
    [0, 1.06],
    [300, 1.06],
    [520, 1.01],
    [650, 0.84],
    [690, 1.055],
    [750, 1],
    [1150, 1],
    [1240, 1.035],
    [1550, 0.985],
    [1692, 0.992],
  ]);

  const pupilX = sample(t, [
    [0, 0],
    [800, 0],
    [865, -5.8],
    [930, -5.8],
    [1000, 6.2],
    [1080, 6.2],
    [1150, 4.6],
    [1820, 4.6],
    [2050, 0],
  ]);
  const pupilY = sample(t, [
    [0, 0],
    [850, 1.1],
    [1000, -0.7],
    [1150, 0],
    [2050, 0],
  ]);

  let stretch = 0;
  if (t >= 1250 && t < 1650) {
    const progress = phase(t, 1250, 1650);
    /* A restrained geometric overshoot before the spring is released. */
    stretch = easeOut(progress) + Math.sin(Math.PI * progress) * 0.032;
  } else if (t >= 1650 && t < 1692) {
    stretch = lerp(1.02, 1, smooth(phase(t, 1650, 1692)));
  } else if (t >= 1692) {
    stretch = springToRest(t - 1692);
  }

  let actorShiftX = sample(t, [
    [0, 0],
    [1150, 0],
    [1240, -5],
    [1692, -3],
    [1819, 0],
  ]);
  let actorRotation = sample(t, [
    [0, 0],
    [750, 0],
    [865, -1.1],
    [1000, 0.9],
    [1150, 0],
    [1240, -1],
    [1692, 0.35],
    [1819, 0],
  ]);

  if (t >= YUMI_MINIMAL_SNAP_MS) {
    const reaction = reactionSpring(t - YUMI_MINIMAL_SNAP_MS);
    actorShiftX = -8 * reaction;
    actorRotation = -1.35 * reaction;
    bodyScaleX = 1 - 0.055 * reaction;
    bodyScaleY = 1 + 0.06 * reaction;
  }

  const blink = blinkAt(t, 2180, 2230, 2300);
  /* One 60fps frame: visible on the same beat as the spring's first rest. */
  const wordmark = smoother(phase(t, 1804, YUMI_MINIMAL_SNAP_MS));
  const handoff = smoother(phase(t, 2550, YUMI_MINIMAL_DURATION_MS));

  return {
    "--actor-x": `${number(actorX, 3)}vw`,
    "--actor-y": `${number(actorY, 2)}px`,
    "--actor-shift-x": `${number(actorShiftX, 2)}px`,
    "--actor-rotation": `${number(actorRotation, 3)}deg`,
    "--actor-opacity": t < 300 ? "0" : "1",
    "--body-scale-x": number(bodyScaleX),
    "--body-scale-y": number(bodyScaleY),
    "--stretch": number(stretch),
    /* 82% of the SVG viewBox makes the complete silhouette ~2.1x wider. */
    "--eye-x": `${number(stretch * 82, 3)}%`,
    /* The connector's visible base is ~33.7% of the viewBox. */
    "--bridge-scale": number(1 + stretch * 2.43),
    "--pupil-x": `${number(pupilX, 2)}px`,
    "--pupil-y": `${number(pupilY, 2)}px`,
    "--blink": number(blink),
    "--wordmark-opacity": number(wordmark),
    "--wordmark-y": `${number(lerp(4, 0, wordmark), 2)}px`,
    "--scene-opacity": number(1 - handoff),
    "--scene-exit-y": `${number(-6 * handoff, 2)}px`,
    "--handoff-opacity": number(handoff),
    "--handoff-y": `${number(lerp(8, 0, handoff), 2)}px`,
  };
}
