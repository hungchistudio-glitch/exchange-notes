import { planetTrack, STORY_DURATION_MS, STORY_TRACKS } from "./storyTimeline";

/** Sample only the Earth's three tracks. Their translate/scale lists have the
 * same order at every key, so numeric interpolation matches Web Animations.
 * Compile units and easing on resize; drawing never asks the DOM for styles. */
type Pose = { x: number; y: number; scale: number; opacity: number };
const mix = (a: number, b: number, p: number) => a + (b - a) * p;

function easing(value: string) {
  if (value === "linear") return (p: number) => p;
  const points = value.match(/^cubic-bezier\(([^)]+)\)$/)?.[1].split(",").map(Number);
  if (!points || points.length !== 4) throw new Error(`Unsupported story easing: ${value}`);
  const [x1, y1, x2, y2] = points;
  const curve = (t: number, a: number, b: number) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3;
  return (p: number) => {
    if (p <= 0 || p >= 1) return p;
    let low = 0, high = 1;
    for (let i = 0; i < 18; i++) {
      const t = (low + high) / 2;
      if (curve(t, x1, x2) < p) low = t;
      else high = t;
    }
    return curve((low + high) / 2, y1, y2);
  };
}

function compile(frames: Keyframe[], width: number, height: number) {
  const keys = frames.map(frame => {
    const transform = String(frame.transform ?? "");
    const move = transform.match(/translate3d\(([-\d.]+)(px|%)?,\s*([-\d.]+)(px|%)?,\s*0\)/);
    const scale = transform.match(/scale\(([-\d.]+)\)/);
    return {
      at: Number(frame.offset) * STORY_DURATION_MS,
      ease: easing(frame.easing ?? "linear"),
      pose: {
        x: move ? Number(move[1]) * (move[2] === "%" ? width / 100 : 1) : 0,
        y: move ? Number(move[3]) * (move[4] === "%" ? height / 100 : 1) : 0,
        scale: scale ? Number(scale[1]) : 1,
        opacity: Number(frame.opacity ?? 1),
      } satisfies Pose,
    };
  });
  return (time: number): Pose => {
    const next = keys.findIndex(key => key.at > time);
    if (next === 0) return keys[0].pose;
    if (next < 0) return keys[keys.length - 1].pose;
    const a = keys[next - 1], b = keys[next];
    const p = a.ease((time - a.at) / (b.at - a.at));
    return { x: mix(a.pose.x, b.pose.x, p), y: mix(a.pose.y, b.pose.y, p), scale: mix(a.pose.scale, b.pose.scale, p), opacity: mix(a.pose.opacity, b.pose.opacity, p) };
  };
}

export function compileEarthMotion(width: number, height: number) {
  const orbit = compile(STORY_TRACKS.orbit, width, height);
  const planet = compile(planetTrack(width, height), 1.75 * width, 1.75 * width);
  const flare = compile(STORY_TRACKS.flare, 0, 0);
  return (time: number) => ({ orbit: orbit(time), planet: planet(time), flare: flare(time).opacity });
}
