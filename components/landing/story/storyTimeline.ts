import type { YumiParts } from "@/lib/yumi3d/scene";

/* =========================================================
   YU + MI = Yumi, as a film

   Chi (2026-10-15): two pieces drifting in space, YU and MI, collide again
   and again until they meet at a perfect angle and become Yumi; she sees a
   shining planet and sets off to learn there; docks at Station 33 for
   something to wear and a keepsake; and lands on Earth. "Hollywood-level,
   silky."

   One clock, two kinds of picture:

   - Every painted layer — space, the drifting matter, the light of the
     merge, the planet, the station, the dive, the sky — is a Web Animation
     built from the keyframes below. They run on the compositor, which is
     what keeps them smooth while the main thread draws the 3D Yumi, and
     what lets a chapter jump be one currentTime write.
   - The 3D Yumi reads the same clock each frame through yumiAt().

   Everything here is a pure function of time, so it is tested without a
   browser, and scrubbing to any moment shows exactly what playing to it
   would have.
   ========================================================= */

export const STORY_DURATION_MS = 35_000;
/** The instant YU and MI become one. */
export const MERGE_AT_MS = 11_000;

export const STORY_ACTS = [
  { id: "drift", start: 0 },
  { id: "meet", start: 7_000 },
  { id: "earth", start: 13_500 },
  { id: "station", start: 20_500 },
  { id: "land", start: 28_000 },
] as const;

export type StoryActId = (typeof STORY_ACTS)[number]["id"];

/** Where the end card comes up, over the sky. */
export const END_CARD_AT_MS = 33_200;

/** Which act a moment belongs to. */
export function actAt(time: number): number {
  let index = 0;
  for (let i = 0; i < STORY_ACTS.length; i += 1) {
    if (time >= STORY_ACTS[i].start) index = i;
  }
  return index;
}

/**
 * The moment a still frame of each act should show under reduced motion:
 * late enough that the act has happened, early enough to still be it.
 */
export const ACT_STILLS_MS = [3_000, 12_400, 18_000, 25_000, 34_500] as const;

// ------------------------------------------------------------ easing

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const easeOut = (x: number) => 1 - (1 - x) ** 3;
const easeIn = (x: number) => x * x * x;
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

/** 0..1 across [from, to], eased. */
function span(time: number, from: number, to: number, ease: (x: number) => number = easeInOut) {
  return ease(clamp01((time - from) / (to - from)));
}

// ------------------------------------------------------------ Yumi

export type StoryYumi = {
  /** Stage fractions: where her centre is. */
  x: number;
  y: number;
  /** Her radius, as a fraction of the stage's shorter side. */
  r: number;
  /** YU and MI apart, or null once they are Yumi. */
  parts: YumiParts | null;
  /** Where she looks, -1..1, or null to face the camera. */
  gaze: { x: number; y: number } | null;
};

const QUARTER = Math.PI / 2;

/**
 * YU and MI before they meet: YU a U (the shell turned a quarter, opening
 * up), MI an i (the band stood upright, the eye its dot). Both drift and
 * tumble a little; neither ever stops moving until they are one.
 *
 * `portrait` stacks them instead of setting them side by side, so a phone
 * held upright has room for both.
 */
function partsAt(time: number, portrait: boolean, reduced: boolean): YumiParts | null {
  if (time >= MERGE_AT_MS) return null;

  const wobble = reduced ? 0 : 1;
  const sx = portrait ? 0.42 : 1;
  const sy = portrait ? 2.1 : 1;

  // Act I: drifting, slowly closing in.
  const drift = span(time, 0, 7_000, easeInOut);
  let yu = {
    x: lerp(-5.2, -3.8, drift) * sx + Math.sin(time * 0.0006) * 0.25 * wobble,
    y: (0.9 + Math.sin(time * 0.0009) * 0.3 * wobble) * sy,
    rotation: QUARTER + Math.sin(time * 0.0005) * 0.18 * wobble,
  };
  let mi = {
    x: lerp(5.0, 3.6, drift) * sx + Math.sin(time * 0.0007 + 1) * 0.25 * wobble,
    y: (-0.7 + Math.sin(time * 0.0011 + 2) * 0.3 * wobble) * sy,
    rotation: QUARTER + Math.sin(time * 0.0006 + 1) * 0.22 * wobble,
  };

  if (time < 7_000) return { yu, mi };

  // Act II: closer, a glancing bump, then the perfect angle.
  const close = span(time, 7_000, 9_000, easeIn);
  yu = {
    x: lerp(yu.x, -1.9 * sx, close),
    y: lerp(yu.y, 0.4 * sy, close),
    rotation: yu.rotation,
  };
  mi = {
    x: lerp(mi.x, 1.5 * sx, close),
    y: lerp(mi.y, -0.2 * sy, close),
    rotation: mi.rotation,
  };

  const bump = span(time, 9_000, 9_500, easeOut);
  yu = { x: yu.x + (-0.5 * sx) * bump, y: yu.y, rotation: yu.rotation - 0.25 * bump };
  mi = { x: mi.x + 1.1 * sx * bump, y: mi.y, rotation: mi.rotation + 0.9 * bump };

  const join = span(time, 9_500, MERGE_AT_MS, easeInOut);
  return {
    yu: { x: lerp(yu.x, 0, join), y: lerp(yu.y, 0, join), rotation: lerp(yu.rotation, 0, join) },
    mi: { x: lerp(mi.x, 0, join), y: lerp(mi.y, 0, join), rotation: lerp(mi.rotation, 0, join) },
  };
}

/** Yumi at a moment of the film. */
export function yumiAt(time: number, portrait = false, reduced = false): StoryYumi {
  const parts = partsAt(time, portrait, reduced);

  // Size: small while there are two of them, closer as they meet, a
  // little pulse as they click together.
  let r = portrait ? 0.15 : 0.17;
  r = lerp(r, 0.2, span(time, 7_000, MERGE_AT_MS));
  const click = span(time, MERGE_AT_MS, MERGE_AT_MS + 260, easeOut) - span(time, MERGE_AT_MS + 260, MERGE_AT_MS + 900);
  r += 0.016 * click;

  let x = 0.5;
  let y = 0.47;
  let gaze: StoryYumi["gaze"] = null;

  // Act III: she drifts to one side and turns to the planet.
  const toPlanet = span(time, 13_500, 15_500);
  x = lerp(x, portrait ? 0.5 : 0.36, toPlanet);
  y = lerp(y, portrait ? 0.62 : 0.5, toPlanet);
  r = lerp(r, portrait ? 0.15 : 0.17, toPlanet);
  if (time >= 14_200 && time < 20_500) gaze = { x: portrait ? 0.3 : 1, y: portrait ? -1 : -0.25 };

  // Act IV: docked on the stand, in the middle.
  const dock = span(time, 20_500, 22_000);
  x = lerp(x, 0.5, dock);
  y = lerp(y, 0.5, dock);
  r = lerp(r, 0.2, dock);

  // Act V: off the stand, a breath upward, then down through the sky.
  const lift = span(time, 28_000, 29_400);
  y -= 0.06 * lift;
  // She comes down beside the end card's words (above them on a phone),
  // and once she is down, looks at them.
  const fall = span(time, 29_400, 33_000);
  x = lerp(x, portrait ? 0.5 : 0.68, fall);
  y = lerp(y, portrait ? 0.74 : 0.6, fall);
  r = lerp(r, portrait ? 0.13 : 0.16, fall);
  if (time >= 29_400 && time < 33_000) gaze = { x: 0, y: 0.8 };
  const touchdown = span(time, 33_000, 33_500, easeOut) - span(time, 33_500, 34_100);
  y += 0.012 * touchdown;
  if (time >= 33_700) gaze = portrait ? { x: 0, y: -0.7 } : { x: -0.8, y: -0.1 };

  return { x, y, r, parts, gaze };
}

// ------------------------------------------------------------ the layers

type Key = [time: number, frame: Keyframe, ease?: string];

const EASE = "cubic-bezier(0.65, 0, 0.35, 1)";
const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_IN = "cubic-bezier(0.55, 0, 1, 0.45)";

/**
 * Keys at moments in the film, as Web Animation keyframes over the whole
 * duration. A key's easing shapes the stretch that follows it. Every track
 * opens at 0 and closes at the end, holding its first and last values.
 */
function track(keys: Key[]): Keyframe[] {
  const sorted = [...keys].sort((a, b) => a[0] - b[0]);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first[0] > 0) sorted.unshift([0, first[1]]);
  if (last[0] < STORY_DURATION_MS) sorted.push([STORY_DURATION_MS, last[1]]);
  return sorted.map(([time, frame, easing]) => ({
    ...frame,
    offset: time / STORY_DURATION_MS,
    easing: easing ?? "linear",
  }));
}

const t3 = (x: number, y: number, scale = 1) => `translate3d(${x}%, ${y}%, 0) scale(${scale})`;

/** Every painted layer, by the data-track name it carries in the markup. */
export const STORY_TRACKS = {
  /* The camera: a slow push, a dolly in on the meeting, a pan to the
     planet. It carries space, the matter, the flash and the planet. */
  camera: track([
    [0, { transform: t3(0, 0, 1.06) }, EASE],
    [7_000, { transform: t3(-1, 0.6, 1.1) }, EASE_IN],
    [MERGE_AT_MS, { transform: t3(0, 0, 1.2) }, EASE_OUT],
    [12_400, { transform: t3(0, 0, 1.12) }, EASE],
    [13_500, { transform: t3(0, 0, 1.12) }, EASE],
    [19_000, { transform: t3(-5, -1, 1.02) }],
    [20_500, { transform: t3(-5, -1, 1.02) }],
  ]),
  /* Two depths of stars, drifting at different speeds: parallax. */
  starsFar: track([
    [0, { transform: t3(0, 0) }],
    [STORY_DURATION_MS, { transform: t3(-3, 1) }],
  ]),
  starsNear: track([
    [0, { transform: t3(0, 0) }],
    [STORY_DURATION_MS, { transform: t3(-9, 3) }],
  ]),
  /* Everything else adrift out there; it thins once there is a Yumi. */
  matter: track([
    [0, { opacity: 1 }],
    [10_600, { opacity: 1 }, EASE],
    [11_600, { opacity: 0.35 }],
    [13_500, { opacity: 0.35 }, EASE],
    [16_000, { opacity: 0 }],
  ]),
  /* The light of the meeting: a bloom and a ring that runs outward. */
  flash: track([
    [0, { opacity: 0, transform: "scale(0.2)" }],
    [10_850, { opacity: 0, transform: "scale(0.2)" }, EASE_OUT],
    [11_050, { opacity: 1, transform: "scale(0.9)" }, EASE_OUT],
    [12_100, { opacity: 0, transform: "scale(2.4)" }],
  ]),
  ring: track([
    [0, { opacity: 0, transform: "scale(0.3)" }],
    [10_950, { opacity: 0, transform: "scale(0.3)" }],
    [11_000, { opacity: 0.9, transform: "scale(0.35)" }, EASE_OUT],
    [12_600, { opacity: 0, transform: "scale(3.2)" }],
  ]),
  /* The planet she sees: rising in from the right, then a slow glow. */
  planet: track([
    [0, { opacity: 0, transform: t3(22, 26, 0.55) }],
    [13_500, { opacity: 0, transform: t3(22, 26, 0.55) }, EASE_OUT],
    [17_800, { opacity: 1, transform: t3(0, 0, 1) }, EASE],
    [20_300, { opacity: 1, transform: t3(-2, -1, 1.06) }, EASE_IN],
    [21_200, { opacity: 0, transform: t3(-4, -2, 1.18) }],
  ]),
  flare: track([
    [0, { opacity: 0 }],
    [14_800, { opacity: 0 }, EASE_OUT],
    [16_200, { opacity: 0.85 }, EASE],
    [18_400, { opacity: 0.45 }, EASE],
    [20_500, { opacity: 0 }],
  ]),
  /* Station 33's window on Earth: in with the dock, and in act V the dive
     toward the planet below it, until the window is all atmosphere. */
  orbit: track([
    [0, { opacity: 0, transform: t3(0, 0, 1.08) }],
    [20_500, { opacity: 0, transform: t3(0, 0, 1.08) }, EASE_OUT],
    [21_700, { opacity: 1, transform: t3(0, 0, 1) }],
    [29_000, { opacity: 1, transform: t3(0, 0, 1) }, EASE_IN],
    [32_400, { opacity: 1, transform: t3(0, -16, 2.7) }, EASE],
    [33_400, { opacity: 0, transform: t3(0, -20, 3.2) }],
  ]),
  /* The dock rises under her, and falls away when she leaves. */
  dock: track([
    [0, { opacity: 0, transform: t3(0, 40) }],
    [20_700, { opacity: 0, transform: t3(0, 40) }, EASE_OUT],
    [22_200, { opacity: 1, transform: t3(0, 0) }],
    [28_200, { opacity: 1, transform: t3(0, 0) }, EASE_IN],
    [29_600, { opacity: 0, transform: t3(0, 120) }],
  ]),
  /* Cloud tops rushing past on the way down. */
  streaks: track([
    [0, { opacity: 0 }],
    [30_000, { opacity: 0 }, EASE],
    [31_000, { opacity: 0.85 }],
    [32_600, { opacity: 0.85 }, EASE],
    [33_300, { opacity: 0 }],
  ]),
  /* Below the clouds: a morning sky, the colour of the page she lands on. */
  sky: track([
    [0, { opacity: 0 }],
    [31_400, { opacity: 0 }, EASE],
    [33_000, { opacity: 1 }],
  ]),
  /* Thin black bars in, as the film begins; out as she lands. */
  letterbox: track([
    [0, { transform: "scaleY(1.9)" }, EASE_OUT],
    [1_400, { transform: "scaleY(1)" }],
    [32_600, { transform: "scaleY(1)" }, EASE],
    [33_600, { transform: "scaleY(0)" }],
  ]),
  /* The film's own progress, under the chapters. */
  progress: track([
    [0, { transform: "scaleX(0)" }],
    [STORY_DURATION_MS, { transform: "scaleX(1)" }],
  ]),
} satisfies Record<string, Keyframe[]>;

export type StoryTrack = keyof typeof STORY_TRACKS;
