/* =========================================================
   The shared video's finish (Chi, 2026-11-22: 分享影片升級)

   Laid over each frame of a recorded share card (components/share/
   ShareStudio.tsx), after the card itself is drawn:

   - a sheen: one soft diagonal band of light crossing the card once, just
     after its opening has decoded, as light runs over a printed card;
   - grain: a fine film grain, moved every frame so it lives rather than
     sitting on the picture like dirt.

   Only the video gets them; the still picture is left as it was.
   ========================================================= */

const SHEEN_FROM_MS = 1300;
const SHEEN_MS = 1000;
const GRAIN_TILE = 128;

let grain: HTMLCanvasElement | null = null;

function grainTile() {
  if (grain) return grain;
  grain = document.createElement("canvas");
  grain.width = grain.height = GRAIN_TILE;
  const ctx = grain.getContext("2d");
  if (!ctx) return grain;
  const image = ctx.createImageData(GRAIN_TILE, GRAIN_TILE);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = Math.random() * 255;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return grain;
}

/** The band of light, `elapsedMs` into the video. */
export function drawSheen(ctx: CanvasRenderingContext2D, elapsedMs: number) {
  const t = (elapsedMs - SHEEN_FROM_MS) / SHEEN_MS;
  if (t <= 0 || t >= 1) return;
  const { width, height } = ctx.canvas;
  /* Eased across, faint at the ends of its run. */
  const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  const span = width + height;
  const x = -height + eased * span;
  const band = ctx.createLinearGradient(x, 0, x + height * 0.6, height * 0.6);
  const strength = 0.22 * Math.sin(Math.PI * t);
  band.addColorStop(0, "rgba(255, 255, 255, 0)");
  band.addColorStop(0.5, `rgba(255, 255, 255, ${strength.toFixed(3)})`);
  band.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** Film grain for frame `tick`. */
export function drawGrain(ctx: CanvasRenderingContext2D, tick: number) {
  const tile = grainTile();
  const pattern = ctx.createPattern(tile, "repeat");
  if (!pattern) return;
  /* A different offset every frame, so the grain moves. */
  const ox = (tick * 53) % GRAIN_TILE;
  const oy = (tick * 97) % GRAIN_TILE;
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.07;
  ctx.translate(-ox, -oy);
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, ctx.canvas.width + GRAIN_TILE, ctx.canvas.height + GRAIN_TILE);
  ctx.restore();
}
