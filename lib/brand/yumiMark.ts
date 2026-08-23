/**
 * The Yumi Essential Mark — the brand's geometry, in one place.
 *
 * Open. Connect. See. An open arc, a connection axis, and an eye: nothing in
 * this file exists that does not make one of those three more recognisable.
 *
 * It is data rather than markup so that everything downstream draws the same
 * mark from the same numbers — the React component in
 * components/ui/YumiLogo.tsx, the static asset tree under public/yumi-brand,
 * the favicon, and the app icons the OS paints. A logo that is re-drawn per
 * surface drifts per surface; this one cannot.
 *
 * Coordinates are computed, not transcribed. Every dimension below descends
 * from the ratios in CONSTRUCTION, so the mark can be re-scaled, re-weighted
 * or re-balanced by changing one number and re-running
 * `npm run generate:brand`. tests/yumiMark.test.ts pins the relationships
 * those numbers have to keep — the axis merging at both ends, the pupil
 * having room to move, the eye staying on the arc's own circle — rather than
 * the numbers themselves, which are meant to be tuned.
 */

/**
 * The construction grid.
 *
 * Everything is measured against the arc's radius rather than against the
 * logo's width, because the arc is the thing the mark is built out of: the
 * eye sits a radius along the axis, the axis is that circle's diameter, and
 * the box is whatever the ink reaches. Width is an outcome, not an input.
 *
 * The brief gives bands rather than values. They are wide enough that two
 * designers working from them would not draw the same mark, so this file is
 * where the choosing happens — and where it departs from them, which the
 * note below the table explains.
 */
export const CONSTRUCTION = {
  /**
   * Arc radius on the stroke's centreline, and the unit everything else is
   * measured against. Change it and the whole mark scales; change anything
   * else and the mark's proportions change.
   */
  arcRadius: 32.5,

  /** Main arc and connection axis. One weight, shared. */
  mainStroke: 9.5,

  /**
   * Half of the arc's opening, in degrees, measured off the horizontal. The
   * arc therefore covers 256° and the mouth spans 104°.
   *
   * This is the single most load-bearing number in the file. Widen it and the
   * arc slumps toward a headphone bracket; narrow it and the mark closes into
   * a ring with a dot stuck to it. At 52° the opening still reads clearly as
   * *pointing right*, which is the direction Yumi is looking.
   */
  openingHalfAngle: 52,

  /**
   * Where the eye sits, as a multiple of the arc radius, measured from the
   * arc's centre along the axis.
   *
   * At exactly 1 the eye's centre lands on the arc's own centreline — the
   * point the C would pass through if it closed — and the connection axis
   * becomes that circle's horizontal diameter. Every part of the mark is then
   * described by one circle and one radius, which is what stops the eye from
   * reading as a separate object bolted to the end of a bar.
   *
   * It also sets the mark's only real negative space: the terminals clear the
   * eye by 10.25 units, about an eighth of the logo's width. Close enough for
   * the eye to sit *in* the mouth, far enough that the opening still reads.
   */
  eyeOffset: 1,

  /** Outer radius of the eye. */
  eyeRadius: 13.5,

  /**
   * The outer ring's stroke, 58% of the main stroke.
   *
   * Related to the body's weight but not equal to it: matched exactly, the
   * ring reads heavier than the arc, because a small circle's stroke wraps
   * round on itself and the ink piles up.
   */
  eyeStroke: 5.5,

  /**
   * Pupil radius — exactly a quarter of the eye's outer radius, which puts
   * the pupil's diameter at half the field's.
   *
   * Larger and the eye becomes a full stop with a hairline round it; the
   * field stops being a field, and the look animation has nowhere to move
   * the pupil to. Smaller and the eye stops focusing on anything.
   */
  pupilRadius: 4,

  /** Highlight diameter as a fraction of the pupil's. */
  highlightRatio: 0.22,

  /**
   * Where the highlight sits inside the pupil, as a fraction of the pupil's
   * radius, on the up-and-right diagonal.
   *
   * The resting pupil is centred in the eye — see the pupil note below — so
   * this is the only thing in the static mark that says which way Yumi is
   * facing.
   */
  highlightOffset: 0.44,
} as const;

/**
 * The construction above departs from the specification's baseline ratios in
 * §11, and it is worth being explicit about where, because the departure is
 * the design work rather than an oversight.
 *
 * §11 measures everything against 100 units of *logo width* and asks for an
 * arc of 58–64, an eye of 21–25 and a main stroke of 8–11. Those three cannot
 * describe the mark in the brief's own mockup: they add up to a composition
 * where the eye sits far out to the right with a long bar reaching it, which
 * draws as a lollipop — or, less kindly, an anchor. Drawn honestly to those
 * numbers the eye also loses its field: an eye 23 units across with a 6-unit
 * ring and an 8-unit pupil has 1.5 units of daylight left in it, which at any
 * size at all is a black disc with a scratch round it.
 *
 * So the mark is built to the brief's *rules* — open arc, connection axis,
 * eye, round terminals, one stroke weight, a mouth that points right, an eye
 * with a readable field — and to the composition its mockup actually shows,
 * with the eye nested in the mouth. Measured back against 100 units of logo
 * width the result runs heavier than §11: arc 74.5, eye 32.4, stroke 11.4,
 * ring 6.6, pupil 4.8. §11 calls itself a baseline and names eye alignment,
 * pupil size and visual centre as the things optical correction must fix;
 * this is that correction, and tests/yumiMark.test.ts pins the relationships
 * that actually hold the mark together rather than the bands that do not.
 */

/** Degrees to radians, used often enough here to be worth a name. */
const rad = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * Coordinates are rounded before they reach a file. Two decimals is finer
 * than any renderer resolves at 1024px and keeps the paths readable — an SVG
 * full of 17-digit floats is a generated file that no one can review.
 */
const round = (value: number) => Math.round(value * 100) / 100;

export type YumiMarkOptions = {
  /** Canvas edge. Square, because every surface that carries the mark is. */
  canvas?: number;
  /**
   * How much of the canvas the logo spans — band 0.42–0.52 for an app icon,
   * where the breathing room is the point. Micro renderings push it far
   * higher; a favicon has no home screen to sit calmly on.
   */
  logoWidthRatio?: number;
  /**
   * Optical centring, as a fraction of the canvas, positive = right/down.
   *
   * The mark is not symmetrical and its bounding box lies about it: the arc
   * carries most of the ink on the left, while the eye — the thing an actual
   * viewer looks at — sits far right. Left as a bounding-box centre the whole
   * mark reads as leaning right, so it is nudged back the other way.
   *
   * The nudge is deliberately at the low end of the specification's 0.5–2.5%
   * band, because the ink's own centre of mass sits about 10% of the logo's
   * width to the *left* of the box already; the two effects work against each
   * other and a larger correction over-shoots into visibly off-centre. The
   * upward shift is the ordinary one — an optically centred mark sits a hair
   * above the geometric middle.
   */
  opticalShiftX?: number;
  opticalShiftY?: number;
  /**
   * Dark-mode optical correction. A white mark on a dark ground blooms and
   * reads heavier than the same shape in black on white, so the strokes come
   * down ~3%. Centrelines do not move: this changes the mark's weight, never
   * its silhouette or its spacing, so light and dark stay the same drawing.
   */
  weight?: "regular" | "dark";
  /**
   * The eye's outer ring, as a fraction of the main stroke, when the default
   * relationship has to be overridden — see the micro tier, where the ring is
   * the first thing to disappear into the pixel grid.
   */
  ringToMainStroke?: number;
  /**
   * The pupil, scaled against its construction size.
   *
   * Only micro renderings use this. The eye survives being scaled down as
   * long as three things stay distinguishable across its diameter — ring,
   * field, pupil — and at 32px that diameter is under seven pixels. Taking a
   * fifth off the pupil is what buys the field enough room to still read as
   * a gap rather than as antialiasing between two dark shapes.
   */
  pupilScale?: number;
  /** Micro renderings drop the highlight; below ~24px it is a speck. */
  highlight?: boolean;
};

export type YumiMarkGeometry = {
  canvas: number;
  /** The logo's bounding box, after optical correction. */
  logo: { x: number; y: number; width: number; height: number };
  strokes: { main: number; ring: number };
  arc: {
    cx: number;
    cy: number;
    r: number;
    /** Terminal centres, top and bottom, in canvas coordinates. */
    terminals: { top: [number, number]; bottom: [number, number] };
    d: string;
  };
  connector: { x1: number; x2: number; y: number; d: string };
  eye: {
    cx: number;
    cy: number;
    /** Outer edge of the ring — the eye's silhouette. */
    outerRadius: number;
    /** The ring's own centreline, which is what an SVG circle is drawn on. */
    ringRadius: number;
    /** Inside the ring: the field the pupil lives in. */
    fieldRadius: number;
  };
  pupil: { cx: number; cy: number; r: number; d: string };
  highlight: { cx: number; cy: number; r: number } | null;
};

/**
 * Resolve the mark for one surface.
 *
 * Everything is derived here and nowhere else. Callers pick a canvas and how
 * much of it the logo should occupy; they never place a coordinate.
 */
export function yumiMarkGeometry(
  options: YumiMarkOptions = {}
): YumiMarkGeometry {
  const {
    canvas = 512,
    logoWidthRatio = 0.48,
    opticalShiftX = -0.01,
    opticalShiftY = -0.005,
    weight = "regular",
    ringToMainStroke,
    pupilScale = 1,
    highlight = true,
  } = options;

  /*
   * The mark is laid out in construction units first, with the arc's centre
   * at the origin, and only then scaled onto the canvas. Doing it in that
   * order is what lets the composition be described by relationships — the
   * eye a radius out along the axis, the box reaching as far as the ink does
   * — instead of by a table of coordinates that has to be recomputed by hand
   * every time one of them moves.
   */
  const { arcRadius: r, mainStroke: strokeU, eyeRadius: eyeU } = CONSTRUCTION;
  const eyeCxU = CONSTRUCTION.eyeOffset * r;

  /*
   * The bounding box of the ink. Left, top and bottom are the arc's outer
   * edge — nothing else on the mark reaches as far. Right is the eye, which
   * is the only part that sits outside the arc's circle.
   *
   * It is measured on the *undarkened* stroke, so the dark variant occupies
   * the same box as the light one and the two are interchangeable in a
   * layout even though their weights differ.
   */
  const boxLeftU = -r - strokeU / 2;
  const boxRightU = eyeCxU + eyeU;
  const boxWidthU = boxRightU - boxLeftU;
  const boxHeightU = 2 * r + strokeU;

  /** Construction units to canvas units. */
  const unit = (canvas * logoWidthRatio) / boxWidthU;

  const correction = weight === "dark" ? 0.97 : 1;
  const mainStroke = strokeU * unit * correction;
  const ringStroke =
    (ringToMainStroke === undefined
      ? CONSTRUCTION.eyeStroke * unit
      : strokeU * unit * ringToMainStroke) * correction;

  const arcRadius = r * unit;
  const logoWidth = boxWidthU * unit;
  const logoHeight = boxHeightU * unit;

  const logoX = (canvas - logoWidth) / 2 + canvas * opticalShiftX;
  const logoY = (canvas - logoHeight) / 2 + canvas * opticalShiftY;

  const centreY = logoY + logoHeight / 2;
  const arcCx = logoX - boxLeftU * unit;

  const theta = rad(CONSTRUCTION.openingHalfAngle);
  const terminalX = arcCx + arcRadius * Math.cos(theta);
  const terminalDy = arcRadius * Math.sin(theta);
  const topTerminal: [number, number] = [terminalX, centreY - terminalDy];
  const bottomTerminal: [number, number] = [terminalX, centreY + terminalDy];

  /*
   * One arc command for the whole body — 256° in a single `A`, which SVG is
   * happy to draw and which leaves the path with exactly two anchor points.
   * Drawing it as two mirrored halves, as the mark used to be, puts a seam at
   * the leftmost point where the two strokes butt together; at small sizes
   * that seam shows as a notch in the silhouette.
   *
   * large-arc-flag 1 because the sweep is past a half turn; sweep-flag 0
   * because the path runs anticlockwise on screen, up over the top of the
   * circle and round the left, from the top terminal to the bottom one.
   */
  const arcD = `M ${round(topTerminal[0])} ${round(topTerminal[1])} A ${round(
    arcRadius
  )} ${round(arcRadius)} 0 1 0 ${round(bottomTerminal[0])} ${round(
    bottomTerminal[1]
  )}`;

  const eyeOuterRadius = eyeU * unit;
  const eyeCx = arcCx + eyeCxU * unit;
  const eyeRingRadius = eyeOuterRadius - ringStroke / 2;
  const eyeFieldRadius = eyeOuterRadius - ringStroke;

  /*
   * The connection axis runs from the arc's centreline to the eye ring's
   * centreline, and is drawn with butt caps rather than the round terminals
   * the arc uses.
   *
   * That is not an inconsistency, it is the join. Both ends finish *inside*
   * another shape's ink — the arc's stroke band on the left, the ring's on
   * the right — so neither cap is ever visible, and the three elements read
   * as one continuous glyph instead of a bar laid across two drawings. A
   * round cap on the right would push a bulge past the ring's inner edge and
   * into the eye's field, which is the one place on this mark that has to
   * stay clear.
   */
  const connectorX1 = arcCx - arcRadius;
  const connectorX2 = eyeCx - eyeRingRadius;
  const connectorD = `M ${round(connectorX1)} ${round(centreY)} H ${round(
    connectorX2
  )}`;

  const pupilRadius = CONSTRUCTION.pupilRadius * unit * pupilScale;
  const highlightRadius = pupilRadius * CONSTRUCTION.highlightRatio;
  const highlightOffset =
    (pupilRadius * CONSTRUCTION.highlightOffset) / Math.SQRT2;

  /*
   * The pupil is centred in the eye at rest.
   *
   * The mark used to draw it permanently rolled up and to the right, and that
   * cost more than it bought: it ate the travel the look animation needs, it
   * pushed the pupil close enough to the ring that a blink read as a squint,
   * and at 16px it turned the eye into a crescent. Direction is carried by
   * the arc's opening and by the highlight, which sits up and to the right —
   * both survive being scaled down, and neither pins Yumi's gaze in place.
   */
  const highlightPoint = highlight
    ? {
        cx: eyeCx + highlightOffset,
        cy: centreY - highlightOffset,
        r: highlightRadius,
      }
    : null;

  /*
   * Pupil and highlight are one path with an even-odd fill, so the highlight
   * is a hole rather than a dot painted in the background colour.
   *
   * Two things fall out of that. The mark needs exactly one colour, which is
   * what lets every rendering of it be `currentColor` and follow a theme
   * token; and the highlight is physically part of the pupil, so the look
   * animation moves both by moving one group and the catchlight can never
   * drift off the eye it belongs to.
   */
  const pupilD = highlightPoint
    ? `${circleSubpath(eyeCx, centreY, pupilRadius)} ${circleSubpath(
        highlightPoint.cx,
        highlightPoint.cy,
        highlightPoint.r
      )}`
    : circleSubpath(eyeCx, centreY, pupilRadius);

  return {
    canvas,
    logo: {
      x: round(logoX),
      y: round(logoY),
      width: round(logoWidth),
      height: round(logoHeight),
    },
    strokes: { main: round(mainStroke), ring: round(ringStroke) },
    arc: {
      cx: round(arcCx),
      cy: round(centreY),
      r: round(arcRadius),
      terminals: {
        top: [round(topTerminal[0]), round(topTerminal[1])],
        bottom: [round(bottomTerminal[0]), round(bottomTerminal[1])],
      },
      d: arcD,
    },
    connector: {
      x1: round(connectorX1),
      x2: round(connectorX2),
      y: round(centreY),
      d: connectorD,
    },
    eye: {
      cx: round(eyeCx),
      cy: round(centreY),
      outerRadius: round(eyeOuterRadius),
      ringRadius: round(eyeRingRadius),
      fieldRadius: round(eyeFieldRadius),
    },
    pupil: { cx: round(eyeCx), cy: round(centreY), r: round(pupilRadius), d: pupilD },
    highlight: highlightPoint
      ? {
          cx: round(highlightPoint.cx),
          cy: round(highlightPoint.cy),
          r: round(highlightPoint.r),
        }
      : null,
  };
}

/**
 * A full circle as one subpath, two anchors, two half-turn arcs.
 *
 * `<circle>` would be shorter to write, but the pupil and its highlight have
 * to share a path for the even-odd hole to work, and a path cannot hold a
 * `<circle>`.
 */
function circleSubpath(cx: number, cy: number, r: number) {
  return `M ${round(cx - r)} ${round(cy)} a ${round(r)} ${round(
    r
  )} 0 1 0 ${round(r * 2)} 0 a ${round(r)} ${round(r)} 0 1 0 ${round(
    -r * 2
  )} 0 Z`;
}

/**
 * The three tiers the mark ships in.
 *
 * The identity is the same drawing at every size; what changes is how much
 * room it takes and how much detail survives. Arc, axis and eye are present
 * in all three and are never negotiable — they are the whole mark.
 */
export const YUMI_TIERS = {
  /**
   * Large — splash, onboarding, marketing, the 1024 masters. Everything is
   * drawn, including the catchlight.
   */
  large: { logoWidthRatio: 0.48, highlight: true },

  /**
   * Medium — in-app navigation, profile rows, widgets, roughly 24–96px. The
   * same drawing, given a little more of its canvas because it no longer has
   * a home screen's worth of space around it to look calm in.
   */
  medium: { logoWidthRatio: 0.78, highlight: true },

  /**
   * Micro — favicons, 16–24px marks.
   *
   * Three changes, all forced by the pixel grid, and all of them about the
   * eye — which is what fails first and is also the part the mark cannot
   * afford to lose.
   *
   * The catchlight goes: at 16px it lands under a quarter of a pixel and
   * renders as grey haze inside the pupil. The ring comes down to half the
   * main stroke and the pupil to four fifths of its size, which sounds
   * backwards — the ring is the thin part — but the eye only reads as an eye
   * while ring, field and pupil are three distinguishable bands across seven
   * pixels of diameter. Thickening the ring at that size closes the field and
   * the whole eye collapses into one dot.
   */
  micro: {
    logoWidthRatio: 0.88,
    highlight: false,
    ringToMainStroke: 0.5,
    pupilScale: 0.8,
  },
} as const satisfies Record<string, YumiMarkOptions>;

export type YumiTier = keyof typeof YUMI_TIERS;

/**
 * Brand colour. Two canvases, two marks, and nothing in between — the mark
 * is never grey, never tinted and never a gradient.
 *
 * These are the values behind the --yumi-* tokens in app/globals.css and
 * app/cosmic.css. They live here as well because the standalone asset files
 * cannot read a CSS variable; anything rendered *into the app* should take
 * the token, not these.
 */
export const YUMI_COLORS = {
  /** Pure white, per the specification's master. */
  canvasLight: "#ffffff",
  /**
   * Deep obsidian rather than #000000. Against white, pure black reads as a
   * hole punched in the page; a few points of lift reads as ink.
   */
  markLight: "#090a0c",
  /** Jet obsidian — the dark canvas, warmer and softer than pure black. */
  canvasDark: "#0b0b0f",
  markDark: "#ffffff",
} as const;
