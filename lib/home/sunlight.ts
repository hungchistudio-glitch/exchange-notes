/* =========================================================
   The Standard home's light, by the reader's own clock (Chi, 2026-11-21:
   陰影跟著真實時間走)

   By day the sun crosses the paper: low on the left in the morning, so
   shadows run long to the right; high at noon, short and dark under each
   thing; low on the right toward evening, long to the left and warm. By
   night a warm lamp hangs overhead and shadows are short and soft. Dawn and
   dusk ease between the two.

   It is the device's local time and nothing else: no location is asked
   for, so the day is a plain one, light from six to six. One reading a
   minute is plenty; the change is slower than anyone could watch.

   What it gives is how far a shadow falls per unit of height on the
   floor (lib/yumi3d/ground.ts): `x` to the right, `z` toward the reader
   (lower on screen), plus the shadow's ink and weight.
   ========================================================= */

export type Sunlight = {
  /** Shadow reach per unit height: + to the right, − to the left. */
  x: number;
  /** Shadow reach per unit height toward the reader. */
  z: number;
  /** The shadow's colour, 0xRRGGBB. */
  ink: number;
  /** How dark, 0..1. */
  strength: number;
  /** 0 by night, 1 in full day. */
  day: number;
};

const RISE = 6;
const SET = 18;
/** The lamp by night: just above her and a little behind, so a short shadow. */
const NIGHT = { x: 0.08, z: 0.5 };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const smooth = (a: number, b: number, n: number) => {
  const t = clamp((n - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function mixInk(a: number, b: number, t: number) {
  const channel = (shift: number) => Math.round(mix((a >> shift) & 255, (b >> shift) & 255, t));
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

export function sunlightAt(date: Date): Sunlight {
  const hours = date.getHours() + date.getMinutes() / 60;
  /* 0 at sunrise, 1 at sunset. */
  const through = (hours - RISE) / (SET - RISE);
  const arc = clamp(through, 0, 1);
  /* Twenty minutes or so of dawn and of dusk on either side. */
  const day = smooth(-0.03, 0.05, through) * smooth(1.03, 0.95, through);

  /* The sun's height, 8° at the ends of the day to 68° at noon, and the
     shadow's length from it. */
  const height = (8 + Math.sin(Math.PI * arc) * 60) * (Math.PI / 180);
  const length = clamp(1 / Math.tan(height), 0.32, 2.1);
  /* Its direction across the floor: to the right in the morning, toward the
     reader at noon, to the left in the evening. */
  const heading = mix(0.22, Math.PI - 0.22, arc);
  const sun = { x: length * Math.cos(heading), z: 0.12 + length * Math.sin(heading) * 0.9 };

  /* Low sun is warm; the lamp at night is warm too, and gentler. */
  const golden = day * (1 - smooth(0.12, 0.3, Math.sin(Math.PI * arc)));
  const dayInk = mixInk(0x2e2418, 0x5a3414, golden * 0.8);
  return {
    x: mix(NIGHT.x, sun.x, day),
    z: mix(NIGHT.z, sun.z, day),
    ink: mixInk(0x2b2620, dayInk, day),
    strength: mix(0.72, 1 - golden * 0.12, day),
    day,
  };
}
