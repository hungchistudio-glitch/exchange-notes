/**
 * One clock for the composited film and the frame-by-frame review.
 *
 * ── What the 2.8 seconds are spent on ──────────────────────────────────
 *
 * An opening that is on screen for under three seconds can show one thing
 * arriving, or it can show six things arriving at once. The first reads as
 * composed and the second reads as busy, and the difference is entirely in
 * the beat list below rather than in how anything is drawn.
 *
 * So the beats do not overlap where they do not have to, and there is a real
 * still frame before the handoff — 280ms where nothing moves at all. A hold
 * is what makes the motion before it look deliberate; without one the film
 * simply stops.
 *
 *   0 –  260   the curtain of manifest-white lifts off the whole frame
 * 120 – 1500   the aura blooms, and is the only thing with any depth to it
 * 160 – 1050   the lens arrives, and settles rather than merely stopping
 * 180 – 1080   the halo blooms behind it
 * 480 – 1240   the orbit light travels once around and parks
 * 780 – 1320   one specular pass across the glass
 * 940 – 1460   the wordmark rises
 *1220 – 1640   the caption's two hairlines draw outward from the centre
 *1400 – 1800   the caption text fades up between them
 *1900 – 2040   one blink: the eye is the last thing that moves
 *2040 – 2320   the hold
 *2320 – 2800   the handoff
 *
 * ── Why the reduced-motion branch is a separate function ───────────────
 *
 * It is not the full film with the numbers turned down. Its promise is that
 * nothing translates, rotates or scales at all — the film becomes a cross
 * fade — and that promise is much easier to read, and to test, as its own
 * set of return values than as a ternary inside each of twenty-two.
 */
export const YUMI_PRISM_DURATION_MS = 2800;
export const YUMI_PRISM_REDUCED_DURATION_MS = 650;

/**
 * The still frame, and the one frame the film can be reduced to.
 *
 * Everything has landed, nothing is mid-blink, and the light is still on the
 * orbit. When the compositor is unavailable this is the frame that is painted
 * instead of the film — a lockup somebody chose, rather than whatever the
 * clock happened to be showing.
 */
export const YUMI_PRISM_HOLD_MS = 2060;

/** The named frames the review route offers, and the film's structure. */
export const YUMI_PRISM_CHECKPOINTS = [
  [0, "純光"],
  [260, "浮現"],
  [900, "透鏡"],
  [1460, "品牌"],
  [YUMI_PRISM_HOLD_MS, "定格"],
  [2320, "交接"],
  [YUMI_PRISM_DURATION_MS, "App"],
] as const;

export type PrismFrame = Record<string, string>;

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const phase = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
/** Smoothstep: eased at both ends. For fades and for travel that returns. */
const smooth = (n: number) => n * n * (3 - 2 * n);
/**
 * Exponential out. Almost all of the distance is covered in the first third,
 * which is what makes an arrival read as arriving rather than as sliding.
 * Pinned at the end because 1 - 2^-10 is 0.999, and an opacity that never
 * quite reaches 1 is a brand mark that never quite reaches full strength.
 */
const expo = (n: number) => (n >= 1 ? 1 : 1 - 2 ** (-10 * n));
/**
 * A damped overshoot, for scale and offset only.
 *
 * Returns above 1 around a third of the way through — roughly a one percent
 * overshoot once it is scaled into place below — and rings down from there.
 * Never use it for opacity: values over 1 are invalid there, and the whole
 * effect is invisible on a fade anyway.
 */
const settle = (n: number) =>
  n >= 1 ? 1 : 1 - Math.exp(-6 * n) * Math.cos(7.4 * n);
const value = (n: number) => `${Math.round(n * 10000) / 10000}`;

/** A cross fade with no geometry in it, on its own shorter clock. */
function reducedFrame(t: number): PrismFrame {
  const arrive = smooth(phase(t, 0, 180));
  const leave = smooth(phase(t, 470, YUMI_PRISM_REDUCED_DURATION_MS));

  return {
    "--dawn-opacity": value(1 - smooth(phase(t, 0, 120))),
    "--scene-opacity": value(1 - leave),
    "--scene-y": "0px",
    "--aura-opacity": value(arrive * 0.7),
    "--aura-scale": "1",
    "--halo-opacity": value(arrive * 0.5),
    "--halo-scale": "1",
    "--actor-opacity": value(arrive),
    "--actor-y": "0px",
    "--actor-scale": "1",
    "--orbit-opacity": "0",
    "--orbit-rotation": "0deg",
    "--sweep-opacity": "0",
    "--sweep-x": "0%",
    "--blink": "0",
    "--wordmark-opacity": value(arrive),
    "--wordmark-y": "0px",
    "--rule-scale": "1",
    "--caption-opacity": value(arrive),
    "--caption-y": "0px",
    "--handoff-opacity": value(leave),
  };
}

export function computeYumiPrismFrame(time: number, reduced = false): PrismFrame {
  const t = Number.isFinite(time) ? Math.max(0, time) : 0;
  if (reduced) return reducedFrame(t);

  /*
   * The curtain is the manifest's splash colour, which the OS has already
   * painted before this document existed. Lifting it is what lets the opening
   * have a ground of its own — obsidian in Cosmic Mode — without the seam
   * between the two being a flash.
   *
   * 260ms rather than the 420 it was written at. The curtain covers the whole
   * frame (see the render order in YumiPrismLaunch), so every millisecond of
   * it is also a millisecond of the lens arriving behind gauze. At 420 that
   * was a visible softening of the pearl film, which does not need a dissolve
   * at all — its ground is already this colour. At 260 the curtain is down to
   * 16% by the time the lens is a third of the way in, and the grading is
   * still there for the mode that needs it.
   */
  const dawn = smooth(phase(t, 0, 260));
  const aura = expo(phase(t, 120, 1500));
  const halo = expo(phase(t, 180, 1080));
  /* Opacity and geometry run on different curves: the lens is fully opaque
   * well before it has finished settling into place. */
  const arrive = expo(phase(t, 160, 820));
  const land = settle(phase(t, 160, 1050));
  const orbit = smooth(phase(t, 480, 1240));
  /* The light parks rather than leaving: it is part of the lockup by the time
   * the hold starts, and it goes when the whole scene goes. Fading it out
   * separately would have put movement inside the one still stretch. */
  const orbitIn = smooth(phase(t, 420, 700));
  const sweep = smooth(phase(t, 780, 1320));
  const word = expo(phase(t, 940, 1460));
  const rule = expo(phase(t, 1220, 1640));
  const caption = smooth(phase(t, 1400, 1800));
  /* One blink, after the lockup has landed. It is the only movement in the
   * last second, so it punctuates the hold rather than competing with it. */
  const blink =
    t < 1960 ? smooth(phase(t, 1900, 1960)) : 1 - smooth(phase(t, 1960, 2040));
  const exit = smooth(phase(t, 2320, YUMI_PRISM_DURATION_MS));

  return {
    "--dawn-opacity": value(1 - dawn),
    "--scene-opacity": value(1 - exit),
    "--scene-y": `${value(-6 * exit)}px`,
    "--aura-opacity": value(aura),
    "--aura-scale": value(0.9 + aura * 0.1),
    "--halo-opacity": value(halo * 0.94),
    "--halo-scale": value(0.86 + halo * 0.14),
    "--actor-opacity": value(arrive),
    "--actor-y": `${value(14 * (1 - land))}px`,
    "--actor-scale": value(0.9 + land * 0.1),
    "--orbit-opacity": value(orbitIn),
    "--orbit-rotation": `${value(-140 + 320 * orbit)}deg`,
    "--sweep-opacity": value(Math.sin(Math.PI * sweep) * 0.85),
    "--sweep-x": `${value(-150 + sweep * 300)}%`,
    "--blink": value(blink),
    "--wordmark-opacity": value(word),
    "--wordmark-y": `${value(10 * (1 - word))}px`,
    "--rule-scale": value(rule),
    "--caption-opacity": value(caption),
    "--caption-y": `${value(5 * (1 - caption))}px`,
    "--handoff-opacity": value(exit),
  };
}

/** CSS uses these exact compositions for scrubbing. Only opacity/transform animate. */
export const PRISM_TRACKS: Record<string, (f: PrismFrame) => Keyframe> = {
  sceneWash: f => ({ opacity: f["--scene-opacity"] }),
  dawn: f => ({ opacity: f["--dawn-opacity"] }),
  brandScene: f => ({ opacity: f["--scene-opacity"], transform: `translate3d(0, ${f["--scene-y"]}, 0)` }),
  aura: f => ({ opacity: f["--aura-opacity"], transform: `scale(${f["--aura-scale"]})` }),
  halo: f => ({ opacity: f["--halo-opacity"], transform: `scale(${f["--halo-scale"]})` }),
  actor: f => ({ opacity: f["--actor-opacity"], transform: `translate3d(0, ${f["--actor-y"]}, 0) scale(${f["--actor-scale"]})` }),
  orbit: f => ({ opacity: f["--orbit-opacity"], transform: `rotate(${f["--orbit-rotation"]})` }),
  sweep: f => ({ opacity: f["--sweep-opacity"], transform: `translate3d(${f["--sweep-x"]}, 0, 0) rotate(-24deg)` }),
  pupil: f => ({ transform: `scaleY(${value(1 - Number(f["--blink"]))})` }),
  closedEye: f => ({ opacity: f["--blink"] }),
  wordmark: f => ({ opacity: f["--wordmark-opacity"], transform: `translate3d(0, ${f["--wordmark-y"]}, 0)` }),
  captionRule: f => ({ transform: `scaleX(${f["--rule-scale"]})` }),
  caption: f => ({ opacity: f["--caption-opacity"], transform: `translate3d(0, ${f["--caption-y"]}, 0)` }),
  handoffPreview: f => ({ opacity: f["--handoff-opacity"] }),
};

/**
 * Every beat above, so the compositor is handed the curve rather than asked
 * to interpolate across one. The 60Hz sampling is the curve; the explicit
 * beats guarantee that a frame exists exactly where a phase begins or ends,
 * whatever the sampling happens to straddle.
 */
const FULL_MOTION_BEATS = [
  120, 160, 180, 260, 480, 700, 780, 820, 940, 1050, 1080, 1220, 1240, 1320,
  1400, 1460, 1500, 1640, 1800, 1900, 1960, 2040, 2320,
];

/**
 * How often the curves are sampled into keyframes.
 *
 * This was 60Hz, which is 195 keyframes on each of fifteen tracks — 2,925 of
 * them built and handed to the compositor at mount, measured at 18.5ms for the
 * animate() calls alone on a development Mac, at the one moment the app is
 * also hydrating. A phone pays several times that.
 *
 * 30 halves it, and the film is identical to look at: the browser interpolates
 * linearly between keyframes, and the steepest curve here is the expo arrival,
 * whose linear error over a 33ms step is about 1.5% of opacity at its worst.
 * Going lower starts to show on that arrival; going higher buys nothing.
 */
const SAMPLE_HZ = 30;

export function buildYumiPrismTracks(reduced = false): Record<string, Keyframe[]> {
  const duration = reduced ? YUMI_PRISM_REDUCED_DURATION_MS : YUMI_PRISM_DURATION_MS;
  const times = new Set<number>([0, duration]);
  for (let t = 0; t < duration; t += 1000 / SAMPLE_HZ) times.add(t);
  const beats = reduced ? [120, 180, 470] : FULL_MOTION_BEATS;
  for (const t of beats) times.add(t);
  if (!reduced) for (const [t] of YUMI_PRISM_CHECKPOINTS) times.add(t);
  const tracks: Record<string, Keyframe[]> = {};
  for (const name of Object.keys(PRISM_TRACKS)) tracks[name] = [];
  for (const t of [...times].sort((a, b) => a - b)) {
    const frame = computeYumiPrismFrame(t, reduced);
    for (const [name, compose] of Object.entries(PRISM_TRACKS)) {
      tracks[name].push({ offset: t / duration, ...compose(frame) });
    }
  }
  return tracks;
}
