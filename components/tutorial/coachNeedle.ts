/* =========================================================
   The tour's needle, as geometry

   After Chi's reference (2026-10-18): a long hairline tapering to a point,
   crossed near its other end by a slim four-point star, "but able to curl"
   — and then "更有設計感". So the line is a swash rather than an arc: it
   leaves the star curling one way, sweeps the other, and arrives at its
   point head-on, swelling and thinning along the way the way a pointed
   brush does.

   Drawn pointing down in a 44 × 96 box with the tip at the bottom centre,
   and turned to face its target by CoachPointer. Everything here is
   computed once, at module load, from two cubic Béziers joined smoothly:
   the filled outline (an SVG stroke cannot taper), the spine the light runs
   along, a sheen line beside it, and the star, set square to the needle
   where it crosses.
   ========================================================= */

export const NEEDLE_WIDTH = 44;
export const NEEDLE_LENGTH = 96;

type Point = readonly [number, number];
type Cubic = readonly [Point, Point, Point, Point];

/*
 * The swash. The join at J is smooth: the second segment's first handle
 * continues the first segment's last one in a straight line.
 */
const J: Point = [22, 50];
const SEGMENTS: readonly Cubic[] = [
  [[15, 12], [3, 24], [5, 42], J],
  [J, [37, 57], [31, 80], [22, 94]],
];

/** The tip, where it touches the target. */
export const TIP: Point = [22, 94];
/** Where the star sits on the needle. */
export const STAR_CENTRE: Point = SEGMENTS[0][0];

const MIN_WIDTH = 0.9;
const MAX_WIDTH = 3.3;
/** Where along the needle it is fullest. */
const FULLEST = 0.34;
const SAMPLES_PER_SEGMENT = 40;
/** The short stub behind the star, like the reference's hilt. */
const STUB = 6;

function at([a, b, c, d]: Cubic, t: number): Point {
  const u = 1 - t;
  const k0 = u * u * u;
  const k1 = 3 * u * u * t;
  const k2 = 3 * u * t * t;
  const k3 = t * t * t;
  return [
    k0 * a[0] + k1 * b[0] + k2 * c[0] + k3 * d[0],
    k0 * a[1] + k1 * b[1] + k2 * c[1] + k3 * d[1],
  ];
}

function heading([a, b, c, d]: Cubic, t: number): Point {
  const u = 1 - t;
  const x = 3 * u * u * (b[0] - a[0]) + 6 * u * t * (c[0] - b[0]) + 3 * t * t * (d[0] - c[0]);
  const y = 3 * u * u * (b[1] - a[1]) + 6 * u * t * (c[1] - b[1]) + 3 * t * t * (d[1] - c[1]);
  const length = Math.hypot(x, y) || 1;
  return [x / length, y / length];
}

const smooth = (x: number) => x * x * (3 - 2 * x);

/** A pointed brush: slender from the star, full a third of the way, a long taper. */
function width(s: number) {
  if (s <= FULLEST) return MIN_WIDTH + (MAX_WIDTH - MIN_WIDTH) * smooth(s / FULLEST);
  return MAX_WIDTH * Math.pow(1 - (s - FULLEST) / (1 - FULLEST), 1.15);
}

const round = (value: number) => Math.round(value * 100) / 100;
const point = ([x, y]: Point) => `${round(x)} ${round(y)}`;

/** Points along the whole needle, each with its heading and its share of the length. */
function walk() {
  const raw: Array<{ p: Point; h: Point }> = [];
  SEGMENTS.forEach((segment, index) => {
    for (let i = index === 0 ? 0 : 1; i <= SAMPLES_PER_SEGMENT; i += 1) {
      const t = i / SAMPLES_PER_SEGMENT;
      raw.push({ p: at(segment, t), h: heading(segment, t) });
    }
  });

  let total = 0;
  const along = raw.map((sample, i) => {
    if (i > 0) total += Math.hypot(sample.p[0] - raw[i - 1].p[0], sample.p[1] - raw[i - 1].p[1]);
    return total;
  });

  return raw.map((sample, i) => ({ ...sample, s: along[i] / total }));
}

const SAMPLES = walk();

function outline() {
  const left: Point[] = [];
  const right: Point[] = [];

  for (const { p, h, s } of SAMPLES) {
    const half = width(s) / 2;
    /* The normal, a quarter turn from the heading. */
    left.push([p[0] - h[1] * half, p[1] + h[0] * half]);
    right.push([p[0] + h[1] * half, p[1] - h[0] * half]);
  }

  const [hx, hy] = SAMPLES[0].h;
  const stub: Point = [STAR_CENTRE[0] - hx * STUB, STAR_CENTRE[1] - hy * STUB];

  return `M${point(stub)} L${left.map(point).join(" L")} L${right
    .reverse()
    .map(point)
    .join(" L")} Z`;
}

/** A hairline just off the spine, on one side: the polish on the needle. */
function sheen() {
  const from = Math.floor(SAMPLES.length * 0.12);
  const to = Math.floor(SAMPLES.length * 0.78);
  const line = SAMPLES.slice(from, to).map(({ p, h, s }) => {
    const offset = width(s) * 0.22;
    return [p[0] - h[1] * offset, p[1] + h[0] * offset] as Point;
  });
  return `M${line.map(point).join(" L")}`;
}

function star() {
  /* Long across the needle, short along it, very fine at the waist. */
  const long = 9.5;
  const short = 3.4;
  const waist = 0.5;
  const [dx, dy] = SAMPLES[0].h;
  /* Local x runs along the needle, local y across it. */
  const place = ([x, y]: Point): Point => [
    STAR_CENTRE[0] + x * dx - y * dy,
    STAR_CENTRE[1] + x * dy + y * dx,
  ];
  const p = (x: number, y: number) => point(place([x, y]));

  return [
    `M${p(0, -long)}`,
    `Q${p(waist, -waist)} ${p(short, 0)}`,
    `Q${p(waist, waist)} ${p(0, long)}`,
    `Q${p(-waist, waist)} ${p(-short, 0)}`,
    `Q${p(-waist, -waist)} ${p(0, -long)}`,
    "Z",
  ].join(" ");
}

const cubic = ([a, b, c, d]: Cubic, first: boolean) =>
  `${first ? `M${point(a)} ` : ""}C${point(b)} ${point(c)} ${point(d)}`;

/** The needle's filled outline: stub, star end, swash, point. */
export const NEEDLE_PATH = outline();

/** Its centre line, star to tip, for the light and the draw-in. */
export const SPINE_PATH = SEGMENTS.map((segment, i) => cubic(segment, i === 0)).join(" ");

/** The polish along it. */
export const SHEEN_PATH = sheen();

/** The four-point star where the needle starts. */
export const STAR_PATH = star();
