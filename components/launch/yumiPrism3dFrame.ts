import {
  YUMI_PRISM_DURATION_MS,
  YUMI_PRISM_REDUCED_DURATION_MS,
  computeYumiPrismFrame,
} from "./yumiPrismTimeline";
import type { YumiFilmFrame } from "@/lib/yumi3d/scene";

/* =========================================================
   The same film, with a different actor

   Yumi Prism v1's clock is not reinterpreted here. Every beat, every curve
   and every checkpoint stays where computeYumiPrismFrame puts it — 純光 /
   浮現 / 透鏡 / 品牌 / 定格 / 交接 / App, 2,800ms, one blink at 1900–2040
   and a real 280ms still frame before the handoff. This only reads that
   frame and hands the parts of it that describe the lens to the 3D Yumi
   instead of to a flat one.

   The one deliberate difference is the blink, and it is below.
   ========================================================= */

export {
  YUMI_PRISM_DURATION_MS,
  YUMI_PRISM_REDUCED_DURATION_MS,
  computeYumiPrismFrame,
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const phase = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const smooth = (n: number) => n * n * (3 - 2 * n);
const expo = (n: number) => (n >= 1 ? 1 : 1 - 2 ** (-10 * n));

/**
 * The blink, widened by thirty milliseconds.
 *
 * The film's own track is a triangle that peaks at exactly 1960: the eye is
 * shut for a single instant. That is right for a compositor handed explicit
 * keyframes at 30Hz, and wrong for a scene drawn by whatever frame rAF
 * delivers — measured on a slow device the peak was sampled at 0.50, which
 * is an eye that visibly never closed. It is the one movement in the last
 * second of the opening and the pivot the whole film turns on, so it has to
 * land every time.
 *
 * So it is shut for 30ms rather than for zero, inside the 1900–2040 window
 * the film already reserves for it. The hold at 2040 is untouched, and so
 * is every other beat.
 */
function blinkAt(ms: number): number {
  if (ms < 1900) return 0;
  if (ms < 1960) return smooth(phase(ms, 1900, 1960));
  if (ms < 1990) return 1;
  if (ms < 2040) return 1 - smooth(phase(ms, 1990, 2040));
  return 0;
}

/** The film's frame, as the things the 3D scene knows how to be. */
export function yumiPrism3dFrame(time: number, reduced = false): YumiFilmFrame {
  const t = Number.isFinite(time) ? Math.max(0, time) : 0;
  const frame = computeYumiPrismFrame(t, reduced);

  const actor = Number(frame["--actor-opacity"]);
  const aura = Number(frame["--aura-opacity"]);

  return {
    actor,
    /* The film's actor-y is in CSS pixels against a flat lens; here it is
       world units against a model whose shell is 2 units across, so the
       damped overshoot reads at the same size rather than flinging her. */
    actorY: (-Number(frame["--actor-y"].replace("px", "")) / 14) * 0.5,
    actorScale: Number(frame["--actor-scale"]),
    light: actor,
    /*
     * Her eye carries the aura: lit while the shell is still arriving, and
     * out by the time the wordmark is up, so the brand hold is a lockup
     * rather than a glowing eye.
     */
    glow: reduced ? 0 : aura * 1.5 * (1 - expo(phase(t, 940, 1600))),
    blink: reduced ? 0 : blinkAt(t),
    /*
     * She looks around only while the shell is still condensing around her.
     * From the wordmark onward she is part of a still lockup, and the hold
     * at 2040 has to actually hold.
     */
    look: !reduced && t < 940 ? { x: Math.sin((t / 1000) * 3.4) * 5.5, y: 1.2 } : null,
  };
}
