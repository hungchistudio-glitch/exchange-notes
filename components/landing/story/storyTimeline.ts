import type { YumiOutfit } from "@/lib/shop/catalog";
import type { YumiParts } from "@/lib/yumi3d/scene";

/* =========================================================
   YU + MI = Yumi, as a film

   Chi (2026-10-15): two pieces drifting in space, YU and MI, collide again
   and again until they meet at a perfect angle and become Yumi; she sees a
   shining planet and sets off to learn there; docks at Station 33 for
   something to wear and a keepsake; and lands on Earth. "Hollywood-level,
   silky."

   Chi (2026-10-17): 33 seconds, one continuous shot from the first frame
   to the last, silky. Nothing in it comes to rest and starts again, and
   nothing cross-fades into something else: there is one Earth, seen far off,
   flown down to, and dived into.

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

export const STORY_DURATION_MS = 33_000;
/** The instant YU and MI become one. */
export const MERGE_AT_MS = 9_000;
/** Earth has become Station 33's horizon: the descent ends here. */
export const ARRIVE_AT_MS = 19_000;
/** Yumi is on the stand; the shop's pieces come up after this. */
export const DOCKED_AT_MS = 20_400;
/** The descent to Earth begins. */
const DESCENT_FROM_MS = 15_400;

export const STORY_ACTS = [
  { id: "drift", start: 0 },
  { id: "meet", start: 5_000 },
  /* As the merge's light fades and the planet starts in: the same shot,
     a new chapter. */
  { id: "earth", start: 10_000 },
  { id: "station", start: 18_500 },
  { id: "land", start: 26_000 },
] as const;

export type StoryActId = (typeof STORY_ACTS)[number]["id"];

/**
 * When the layers that come later — the meeting's light, the planet and its
 * flare, Station 33's window and stand — are first drawn, still unseen at
 * opacity 0.
 *
 * Drawing them is the film's one big paint: each is rasterised at the
 * largest zoom it will ever reach, the window at its dive's (measured
 * 2026-10-17: 100–130ms on a phone, up to ~380ms on a desktop, at a chapter
 * change). It cannot come with the play press (the reader is often still
 * scrolling) or at any chapter change: from the drift to the planet the film
 * is one unbroken shot (Chi, 2026-10-17). Two seconds in, the letterbox has
 * settled and YU, MI and the camera are at their slowest.
 */
export const LAYERS_DRAWN_AT_MS = 2_000;

/**
 * Station 33's fitting (Chi, 2026-10-17). On the stand she tries on three
 * looks of the shop's real pieces by herself, with a little hop as each goes
 * on, and goes down to Earth in the last. The reader can still try anything
 * on; their choice takes over from hers.
 */
export const STATION_LOOKS: ReadonlyArray<{ at: number; outfit: YumiOutfit }> = [
  { at: 21_000, outfit: { head: "beret", eyewear: "monocle" } },
  { at: 22_700, outfit: { head: "headphones", pupil: "star-pupil" } },
  { at: 24_400, outfit: { head: "beret", mouth: "bubble-tea" } },
];

/** Which of her looks she has on at a moment of the film; -1 before the first. */
export function lookAt(time: number): number {
  let index = -1;
  for (let i = 0; i < STATION_LOOKS.length; i += 1) {
    if (time >= STATION_LOOKS[i].at) index = i;
  }
  return index;
}

const NO_OUTFIT: YumiOutfit = {};

/**
 * What she has on at a moment of the film, unless the reader has picked.
 *
 * Her looks from the fitting on. Before that, while YU and MI are still
 * apart and the scene shows nothing she wears, she has each look on for a
 * second, unseen: a piece is held back until its shaders are compiled, and
 * the first time that took long enough for the fitting's first look to go
 * on bare. By the fitting, every piece is ready.
 */
export function outfitAt(time: number): YumiOutfit {
  const look = lookAt(time);
  if (look >= 0) return STATION_LOOKS[look].outfit;
  const rehearsal = STATION_LOOKS[Math.floor(time / 1_000) - 1];
  return time < MERGE_AT_MS && rehearsal ? rehearsal.outfit : NO_OUTFIT;
}

/** Where the end card comes up, over the sky. */
export const END_CARD_AT_MS = 31_200;

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
export const ACT_STILLS_MS = [2_500, 9_800, 15_000, 23_000, 32_500] as const;

// ------------------------------------------------------------ easing

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const easeOut = (x: number) => 1 - (1 - x) ** 3;
const easeInQuad = (x: number) => x * x;
const easeInOutSine = (x: number) => (1 - Math.cos(Math.PI * x)) / 2;
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

  /*
   * Acts I and II are one approach (Chi, 2026-10-17: the drift into the
   * meeting in one shot). They drift and close in, faster and faster, all
   * the way to the glancing bump: nothing slows to a stop where the
   * chapter changes. Their sway dies away as they get close.
   */
  const approach = span(time, 0, 7_000, easeInQuad);
  const sway = wobble * (1 - span(time, 4_000, 7_000));
  let yu = {
    x: lerp(-5.2, -1.9, approach) * sx + Math.sin(time * 0.0006) * 0.25 * sway,
    y: (lerp(0.9, 0.4, approach) + Math.sin(time * 0.0009) * 0.3 * sway) * sy,
    rotation: QUARTER + Math.sin(time * 0.0005) * 0.18 * wobble,
  };
  let mi = {
    x: lerp(5.0, 1.5, approach) * sx + Math.sin(time * 0.0007 + 1) * 0.25 * sway,
    y: (lerp(-0.7, -0.2, approach) + Math.sin(time * 0.0011 + 2) * 0.3 * sway) * sy,
    rotation: QUARTER + Math.sin(time * 0.0006 + 1) * 0.22 * wobble,
  };

  if (time < 7_000) return { yu, mi };

  // The glancing bump, then the perfect angle.

  const bump = span(time, 7_000, 7_500, easeOut);
  yu = { x: yu.x + (-0.5 * sx) * bump, y: yu.y, rotation: yu.rotation - 0.25 * bump };
  mi = { x: mi.x + 1.1 * sx * bump, y: mi.y, rotation: mi.rotation + 0.9 * bump };

  const join = span(time, 7_500, MERGE_AT_MS, easeInOut);
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
  r = lerp(r, 0.2, span(time, 5_000, MERGE_AT_MS));
  const click = span(time, MERGE_AT_MS, MERGE_AT_MS + 260, easeOut) - span(time, MERGE_AT_MS + 260, MERGE_AT_MS + 900);
  r += 0.016 * click;

  let x = 0.5;
  let y = 0.47;
  let gaze: StoryYumi["gaze"] = null;

  // Acts III and IV: as its light reaches the edge of the frame she turns
  // to the planet, and while she is still turning she sets off — aside, to
  // watch it come down, and on round to the middle, where the stand rises
  // to meet her. One arc from the merge to the dock, never still.
  const turn = span(time, 10_300, 11_500);
  const way = span(time, 11_000, DOCKED_AT_MS, easeInOutSine);
  const aside = Math.sin(Math.PI * way);
  x = lerp(x, 0.5, way) - (portrait ? 0 : 0.14) * aside;
  y = lerp(y, 0.5, way) + (portrait ? 0.135 : 0) * aside;
  r = lerp(r, 0.2, way) - (portrait ? 0.05 : 0.03) * aside;
  if (time >= 10_300 && time < DOCKED_AT_MS) {
    /* She watches the planet the whole way down: up at it first, then
       down at the horizon it becomes under the station. */
    const down = span(time, DESCENT_FROM_MS, ARRIVE_AT_MS);
    gaze = {
      x: lerp(portrait ? 0.3 : 1, 0, down) * turn,
      y: lerp(portrait ? -1 : -0.25, 0.75, down) * turn,
    };
  }

  // A hop on the stand for each look: up, the new piece on at the top of it,
  // and down.
  if (!reduced) {
    for (const look of STATION_LOOKS) {
      y -= 0.03 * Math.sin(Math.PI * span(time, look.at - 320, look.at + 320));
    }
  }

  // Act V: off the stand, a breath upward, then down through the sky. One
  // arc: she drifts toward where she lands from the moment she leaves, so
  // the top of the hop is not a stop.
  const lift = span(time, 26_000, 27_400);
  y -= 0.06 * lift;
  // She comes down beside the end card's words (above them on a phone),
  // and once she is down, looks at them.
  const across = span(time, 26_000, 31_000);
  const fall = span(time, 27_400, 31_000);
  x = lerp(x, portrait ? 0.5 : 0.68, across);
  y = lerp(y, portrait ? 0.74 : 0.6, fall);
  r = lerp(r, portrait ? 0.13 : 0.16, across);
  if (time >= 27_400 && time < 31_000) gaze = { x: 0, y: 0.8 };
  const touchdown = span(time, 31_000, 31_500, easeOut) - span(time, 31_500, 32_100);
  y += 0.012 * touchdown;
  if (time >= 31_700) gaze = portrait ? { x: 0, y: -0.7 } : { x: -0.8, y: -0.1 };

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
 *
 * Every key of a track names the same properties: Safari runs an animation
 * on its compositor, clear of the 3D Yumi's frames, only when it can.
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

/**
 * Keys along a curve, `frame(p)` at even steps of p from 0 to 1 between two
 * moments. Between keys an animation moves in straight lines, so a motion no
 * single easing can draw — a zoom that feels even all the way down, a push
 * that gathers speed for twelve seconds — is drawn as many short ones.
 */
function curve(from: number, to: number, frame: (p: number, time: number) => Keyframe, steps = 24): Key[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const time = from + ((to - from) * i) / steps;
    return [time, frame(i / steps, time)];
  });
}

const t3 = (x: number, y: number, scale = 1) => `translate3d(${x}%, ${y}%, 0) scale(${scale})`;
const px = (x: number, y: number, scale: number) =>
  `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;

/* Into the merge: slow at first, gathering speed to the punch-in. */
const PUSH = "cubic-bezier(0.45, 0, 0.85, 0.5)";
/* Out of the merge without stopping: the release from the punch-in is
   quick, then the pan glides on until the descent. */
const PAN = "cubic-bezier(0.2, 0.55, 0.3, 1)";
/* The planet's way in: unhurried, settling as the pan does. */
const PLANET_IN = "cubic-bezier(0.3, 0.2, 0.25, 1)";

/** The screen the default keyframes are worked out for (a 2.1:1 desktop
 *  film); the projector replaces them with its own screen's. */
export const PLANET_REFERENCE = { width: 1100, height: 524 } as const;

/**
 * The one Earth (Chi, 2026-10-17).
 *
 * The planet she sees is Station 33's Earth. Its element is drawn where the
 * station's horizon is — a circle 175% of the screen's width, its top at
 * 63% of the height, centred (as OrbitalBackdrop's own Earth) — and it is
 * only ever made smaller than that, never larger, so it is never a small
 * picture blown up. Far off it is shrunk to a globe in the upper right
 * (`globe`: its centre and diameter, for a W × H screen).
 */
export function globe(W: number, H: number) {
  const size = Math.min(0.45 * H, 0.53 * W);
  return { x: 0.87 * W - size / 2, y: 0.12 * H + size / 2, size };
}

/**
 * The planet's keyframes for a W × H screen: waiting beyond the right edge,
 * sliding in as the camera pans, then the descent — a zoom toward one point
 * of it, even all the way down, until it is the station's horizon again and
 * simply stays.
 */
export function planetTrack(W: number, H: number): Keyframe[] {
  const g = globe(W, H);
  const far = g.size / (1.75 * W);
  // From the Earth's own centre to the globe's.
  const dx = g.x - W / 2;
  const dy = g.y - (0.63 * H + 0.875 * W);
  const away = px(dx + 1.5 * g.size, dy + 0.12 * g.size, far * 0.85);
  return track([
    [0, { opacity: 0, transform: away }],
    [10_000, { opacity: 0, transform: away }],
    [10_050, { opacity: 1, transform: away }, PLANET_IN],
    ...curve(DESCENT_FROM_MS, ARRIVE_AT_MS, p => {
      const zoom = far ** (1 - easeInOut(p));
      const toward = (1 - zoom) / (1 - far);
      return { opacity: 1, transform: px(dx * toward, dy * toward, zoom) };
    }),
  ]);
}

/** Every painted layer, by the data-track name it carries in the markup. */
export const STORY_TRACKS = {
  /* The camera: one push from the first frame to the meeting, gathering
     speed, and out of it straight into the pan to the planet — never still
     until the descent. It carries space, the matter and the flash. */
  camera: track([
    [0, { transform: t3(0, 0, 1.06) }, PUSH],
    [MERGE_AT_MS, { transform: t3(0, 0, 1.2) }, PAN],
    [17_000, { transform: t3(-5, -1, 1.02) }],
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
    [8_600, { opacity: 1 }, EASE],
    [9_600, { opacity: 0.35 }],
    [11_000, { opacity: 0.35 }, EASE],
    [14_000, { opacity: 0 }],
  ]),
  /* The light of the meeting: a bloom and a ring that runs outward. */
  flash: track([
    [0, { opacity: 0, transform: "scale(0.2)" }],
    [8_850, { opacity: 0, transform: "scale(0.2)" }, EASE_OUT],
    [9_050, { opacity: 1, transform: "scale(0.9)" }, EASE_OUT],
    [10_100, { opacity: 0, transform: "scale(2.4)" }],
  ]),
  ring: track([
    [0, { opacity: 0, transform: "scale(0.3)" }],
    [8_950, { opacity: 0, transform: "scale(0.3)" }],
    [9_000, { opacity: 0.9, transform: "scale(0.35)" }, EASE_OUT],
    [10_600, { opacity: 0, transform: "scale(3.2)" }],
  ]),
  /* The one Earth: sliding in from the right, then the descent to it (see
     planetTrack: where it waits depends on the screen's shape). */
  planet: planetTrack(PLANET_REFERENCE.width, PLANET_REFERENCE.height),
  /* The sunrise on its rim. It is part of the planet, so it stays on the
     rim as the planet comes in and starts to grow. */
  flare: track([
    [0, { opacity: 0 }],
    [12_400, { opacity: 0 }, EASE_OUT],
    [13_800, { opacity: 0.85 }, EASE],
    [15_200, { opacity: 0.45 }, EASE],
    [16_400, { opacity: 0 }],
  ]),
  /* The window around the Earth: Station 33's stars, sun and glass. It
     comes up around her over the end of the descent. */
  station: track([
    [0, { opacity: 0 }],
    [18_300, { opacity: 0 }, EASE],
    [19_300, { opacity: 1 }],
  ]),
  /*
   * The view out of the window, Earth and all: from the moment she arrives,
   * a push toward Earth so slow it is hardly there while she is on the
   * stand, gathering into the dive of act V until the window is all
   * atmosphere. One move, never still.
   */
  orbit: track([
    [0, { opacity: 0, transform: t3(0, 0, 1) }],
    [9_950, { opacity: 0, transform: t3(0, 0, 1) }],
    [10_000, { opacity: 1, transform: t3(0, 0, 1) }],
    ...curve(ARRIVE_AT_MS, 31_400, (p, time) => {
      const k = 0.06 * p + 0.94 * p ** 5;
      return {
        // Gone into the atmosphere over its last second.
        opacity: 1 - span(time, 30_400, 31_400),
        transform: `translate3d(0, ${(-20 * k).toFixed(2)}%, 0) scale(${(3.2 ** k).toFixed(4)})`,
      };
    }, 32),
  ]),
  /* The dock rises under her as the descent settles, and falls away when
     she leaves. It comes up into the frame from below, under her shell as
     she settles. */
  dock: track([
    [0, { opacity: 0, transform: t3(0, 130) }],
    [18_550, { opacity: 0, transform: t3(0, 130) }],
    [18_600, { opacity: 1, transform: t3(0, 130) }, EASE],
    [DOCKED_AT_MS, { opacity: 1, transform: t3(0, 0) }],
    [26_200, { opacity: 1, transform: t3(0, 0) }, EASE_IN],
    [27_600, { opacity: 0, transform: t3(0, 120) }],
  ]),
  /* Cloud tops rushing past on the way down. */
  streaks: track([
    [0, { opacity: 0 }],
    [28_000, { opacity: 0 }, EASE],
    [29_000, { opacity: 0.85 }],
    [30_600, { opacity: 0.85 }, EASE],
    [31_300, { opacity: 0 }],
  ]),
  /* Below the clouds: a morning sky, the colour of the page she lands on. */
  sky: track([
    [0, { opacity: 0 }],
    [29_400, { opacity: 0 }, EASE],
    [31_000, { opacity: 1 }],
  ]),
  /* Thin black bars in, as the film begins; out as she lands. */
  letterbox: track([
    [0, { transform: "scaleY(1.9)" }, EASE_OUT],
    [1_400, { transform: "scaleY(1)" }],
    [30_600, { transform: "scaleY(1)" }, EASE],
    [31_600, { transform: "scaleY(0)" }],
  ]),
  /* The film's own progress, under the chapters. */
  progress: track([
    [0, { transform: "scaleX(0)" }],
    [STORY_DURATION_MS, { transform: "scaleX(1)" }],
  ]),
} satisfies Record<string, Keyframe[]>;

export type StoryTrack = keyof typeof STORY_TRACKS;
