/** One clock for the composited film and the frame-by-frame review. */
export const YUMI_PRISM_DURATION_MS = 2800;
export const YUMI_PRISM_REDUCED_DURATION_MS = 650;
export const YUMI_PRISM_CHECKPOINTS = [
  [0, "珍珠白"],
  [420, "光環凝聚"],
  [900, "流光"],
  [1400, "品牌揭示"],
  [2000, "定格"],
  [2500, "交接"],
  [YUMI_PRISM_DURATION_MS, "App"],
] as const;

export type PrismFrame = Record<string, string>;
const clamp = (n: number) => Math.min(1, Math.max(0, n));
const phase = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const smooth = (n: number) => n * n * (3 - 2 * n);
const ease = (n: number) => 1 - (1 - n) ** 3;
const value = (n: number) => `${Math.round(n * 10000) / 10000}`;

export function computeYumiPrismFrame(time: number, reduced = false): PrismFrame {
  const t = Number.isFinite(time) ? Math.max(0, time) : 0;
  const arrival = reduced ? smooth(phase(t, 0, 150)) : ease(phase(t, 100, 850));
  const halo = reduced ? arrival : ease(phase(t, 0, 1000));
  const word = reduced ? arrival : ease(phase(t, 780, 1320));
  const caption = reduced ? arrival : smooth(phase(t, 1050, 1550));
  const exit = reduced
    ? smooth(phase(t, 470, YUMI_PRISM_REDUCED_DURATION_MS))
    : smooth(phase(t, 2300, YUMI_PRISM_DURATION_MS));
  const orbit = ease(phase(t, 100, 1850));
  const sweep = smooth(phase(t, 620, 1600));
  // One small blink keeps Yumi alive without distorting the brand silhouette.
  const blink = reduced ? 0 : t < 1740
    ? smooth(phase(t, 1680, 1740))
    : 1 - smooth(phase(t, 1740, 1840));

  return {
    "--scene-opacity": value(1 - exit),
    "--scene-y": reduced ? "0px" : `${value(-5 * exit)}px`,
    "--halo-opacity": value(reduced ? arrival * 0.65 : 0.12 + halo * 0.88),
    "--halo-scale": reduced ? "1" : value(0.82 + halo * 0.18),
    "--actor-opacity": value(arrival),
    "--actor-y": reduced ? "0px" : `${value(12 * (1 - arrival))}px`,
    "--actor-scale": reduced ? "1" : value(0.92 + arrival * 0.08),
    "--orbit-opacity": value(reduced ? 0 : halo * (1 - phase(t, 1850, 2200) * 0.6)),
    "--orbit-rotation": reduced ? "0deg" : `${value(-150 + 260 * orbit)}deg`,
    "--sweep-opacity": value(reduced ? 0 : Math.sin(Math.PI * sweep) * 0.8),
    "--sweep-x": reduced ? "0%" : `${value(-145 + sweep * 290)}%`,
    "--blink": value(blink),
    "--wordmark-opacity": value(word),
    "--wordmark-y": reduced ? "0px" : `${value(9 * (1 - word))}px`,
    "--caption-opacity": value(caption),
    "--caption-y": reduced ? "0px" : `${value(5 * (1 - caption))}px`,
    "--handoff-opacity": value(exit),
  };
}

/** CSS uses these exact compositions for scrubbing. Only opacity/transform animate. */
export const PRISM_TRACKS: Record<string, (f: PrismFrame) => Keyframe> = {
  sceneWash: f => ({ opacity: f["--scene-opacity"] }),
  brandScene: f => ({ opacity: f["--scene-opacity"], transform: `translate3d(0, ${f["--scene-y"]}, 0)` }),
  halo: f => ({ opacity: f["--halo-opacity"], transform: `scale(${f["--halo-scale"]})` }),
  actor: f => ({ opacity: f["--actor-opacity"], transform: `translate3d(0, ${f["--actor-y"]}, 0) scale(${f["--actor-scale"]})` }),
  orbit: f => ({ opacity: f["--orbit-opacity"], transform: `rotate(${f["--orbit-rotation"]})` }),
  sweep: f => ({ opacity: f["--sweep-opacity"], transform: `translate3d(${f["--sweep-x"]}, 0, 0) rotate(-24deg)` }),
  pupil: f => ({ transform: `scaleY(${value(1 - Number(f["--blink"]))})` }),
  closedEye: f => ({ opacity: f["--blink"] }),
  wordmark: f => ({ opacity: f["--wordmark-opacity"], transform: `translate3d(0, ${f["--wordmark-y"]}, 0)` }),
  caption: f => ({ opacity: f["--caption-opacity"], transform: `translate3d(0, ${f["--caption-y"]}, 0)` }),
  handoffPreview: f => ({ opacity: f["--handoff-opacity"] }),
};

export function buildYumiPrismTracks(reduced = false): Record<string, Keyframe[]> {
  const duration = reduced ? YUMI_PRISM_REDUCED_DURATION_MS : YUMI_PRISM_DURATION_MS;
  const times = new Set<number>([0, duration]);
  for (let t = 0; t < duration; t += 1000 / 60) times.add(t);
  const beats = reduced ? [150, 470] : [100, 620, 780, 850, 1000, 1050, 1320, 1550, 1600, 1680, 1740, 1840, 1850, 2200, 2300];
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
