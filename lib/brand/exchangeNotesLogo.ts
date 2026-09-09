/**
 * The Exchange Notes logo — the brand's geometry, in one place.
 *
 * An open C, a bridge across it, and an eye: three elements, one colour, and
 * nothing else. Everything downstream draws this same mark from these same
 * numbers — the React component in components/brand/ExchangeNotesLogo.tsx,
 * the asset tree under public/brand, the favicon, and the app icons the OS
 * paints. A logo that is re-drawn per surface drifts per surface; this one
 * cannot.
 *
 * ── The master canvas ──────────────────────────────────────────────────
 *
 * The specification is written against a 1024 × 1024 master, and so is this
 * file: every number in CONSTRUCTION is a pixel measurement at that size, so
 * a value here can be read straight off the spec and checked without doing
 * arithmetic first. At 1024 with the app-icon ratio, one construction unit is
 * exactly one pixel — see `unit` below.
 *
 * Coordinates are computed, not transcribed. Change a number here and re-run
 * `npm run generate:brand`; every surface moves together.
 * tests/exchangeNotesLogo.test.ts pins the acceptance targets from §25 of the
 * specification, so a change that breaks the drawn proportions fails there
 * rather than in someone's eye three weeks later.
 */

/**
 * The construction grid, in master pixels at a 1024 canvas.
 *
 * Read against the specification: §5 gives the arc, §6 the bridge, §7–§10 the
 * eye and what is inside it. The bounding box those produce is §3's, and the
 * acceptance targets they have to hit are §25's.
 */
export const CONSTRUCTION = {
  /**
   * Arc radius on the stroke's centreline. §5 asks for 215–220; 218 is what
   * makes the mark exactly 490 tall once the stroke is added, which is §3's
   * height and §25's acceptance target.
   */
  arcRadius: 218,

  /** Main arc and bridge. One weight, shared — §6 is explicit that the bridge
   *  must not be thinner than the arc it grows out of. §25: ~54. */
  mainStroke: 54,

  /**
   * Half of the arc's opening, in degrees, off the horizontal. The arc
   * therefore covers 212° and the mouth spans 148°.
   *
   * The one number the specification gives only in prose, and the only one
   * the bounding box cannot pin: the arc passes over the top and bottom of
   * its circle at any angle under 90°, so §3's box is the same whatever this
   * is. It was read off the reference instead, against the two things that
   * image says unambiguously.
   *
   * The arc's terminals sit between the eye's left edge and the eye's centre
   * — the eye looks out through the mouth and its outer half is clear of the
   * C, rather than the C wrapping round past it. That alone rules out
   * anything under about 68°.
   *
   * And the ends still curl inward: past roughly 80° the mark stops reading
   * as the C that §1 and §5's own heading call it and becomes a plain half
   * ring. 74° is the open end of what still curls, which is also what §5
   * means by "essentially a thick left semicircular arc" — 212° is a
   * semicircle and a bit.
   *
   * §27 forbids changing it. If the reference ever says otherwise, this is
   * the single line to move.
   */
  openingHalfAngle: 74,

  /**
   * How far right of the arc's centre the eye sits, along the bridge.
   *
   * §7: eye centre at x ≈ 616 with the arc centred at 534, so 82. It is well
   * inside the arc's own circle — the eye looks out through the mouth rather
   * than sitting on the end of a bar — and the two never touch: the eye's
   * disc crosses the arc's inner edge at ±22° off the horizontal, which is
   * inside the 52° opening where there is no arc to cross.
   */
  eyeCentreOffset: 82,

  /** Outer radius of the eye — §8's ~238 diameter, §25's acceptance target. */
  eyeRadius: 119,

  /**
   * The eye's ring, at roughly two fifths of the main stroke.
   *
   * §8 is emphatic that these must not match: the ring has to read as more
   * refined than the heavy outer C. 21 against 54.
   */
  eyeStroke: 21,

  /** Pupil radius — §9's ~100 diameter. Just under half the eye's own. */
  pupilRadius: 50,

  /**
   * Highlight radius as a fraction of the pupil's, giving §10's ~27 diameter
   * at master scale. Expressed as a ratio rather than a pixel count so the
   * catchlight stays proportionate to the pupil it lives in.
   */
  highlightRatio: 0.27,

  /**
   * Where the catchlight sits inside the pupil, in master pixels from the
   * pupil's centre. §10: +15 across, 14 up.
   *
   * Two numbers rather than one diagonal offset, because the specification's
   * are not equal and §27 forbids centring it. This is the only thing in the
   * static mark that says which way it is looking.
   */
  highlightOffsetX: 15,
  highlightOffsetY: -14,
} as const;

/** Degrees to radians, used often enough here to be worth a name. */
const rad = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * Coordinates are rounded before they reach a file. Two decimals is finer
 * than any renderer resolves at 1024px and keeps the paths readable — an SVG
 * full of 17-digit floats is a generated file that no one can review.
 */
const round = (value: number) => Math.round(value * 100) / 100;

export type ExchangeNotesLogoOptions = {
  /** Canvas edge. Square, because every surface that carries the mark is. */
  canvas?: number;
  /**
   * How much of the canvas the mark spans.
   *
   * The app icon's value is APP_ICON_WIDTH_RATIO and is not negotiable: §3
   * and §29 make the surrounding negative space part of the identity, and
   * §20 says not to enlarge the mark just because a maskable icon leaves
   * room. In-app renderings are a different question — a mark in a 32px
   * header row has the page's own padding around it and no home screen to
   * sit calmly on — which is what LOGO_TIERS is for.
   */
  logoWidthRatio?: number;
  /** Micro renderings drop the catchlight; below ~24px it is under half a
   *  pixel and renders as haze inside the pupil. */
  highlight?: boolean;
};

export type ExchangeNotesLogoGeometry = {
  canvas: number;
  /** The mark's bounding box — the ink, not the canvas. */
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
  bridge: { x1: number; x2: number; y: number; d: string };
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
 * The share of the icon canvas the mark occupies: 446 of 1024.
 *
 * Derived from the construction rather than typed in, so it cannot drift
 * from the geometry it describes. §3 asks for 43.5–43.7%; this is 43.55%.
 */
export const APP_ICON_WIDTH_RATIO = boxWidth() / 1024;

/** Master-canvas width of the ink, in construction units. */
function boxWidth() {
  const { arcRadius, mainStroke, eyeCentreOffset, eyeRadius } = CONSTRUCTION;

  const left = -arcRadius - mainStroke / 2;

  /*
   * The right edge is whichever reaches further, the eye or the arc's
   * terminals. It is the eye at the drawn opening angle — by 39 master pixels
   * — but taking the maximum means the box still describes the ink if that
   * angle is ever changed, rather than silently cropping the terminals.
   */
  const terminalRight =
    arcRadius * Math.cos(rad(CONSTRUCTION.openingHalfAngle)) + mainStroke / 2;

  return Math.max(eyeCentreOffset + eyeRadius, terminalRight) - left;
}

/**
 * Resolve the mark for one surface.
 *
 * Everything is derived here and nowhere else. Callers pick a canvas and how
 * much of it the mark should occupy; they never place a coordinate.
 */
export function exchangeNotesLogoGeometry(
  options: ExchangeNotesLogoOptions = {},
): ExchangeNotesLogoGeometry {
  const {
    canvas = 1024,
    logoWidthRatio = APP_ICON_WIDTH_RATIO,
    highlight = true,
  } = options;

  const {
    arcRadius: r,
    mainStroke: strokeU,
    eyeRadius: eyeU,
    eyeCentreOffset: eyeCxU,
  } = CONSTRUCTION;

  /*
   * The mark is laid out in construction units first, with the arc's centre
   * at the origin, and only then scaled onto the canvas. Doing it in that
   * order is what lets the composition be described by relationships instead
   * of by a table of coordinates that has to be recomputed by hand every time
   * one of them moves.
   */
  const boxLeftU = -r - strokeU / 2;
  const boxWidthU = boxWidth();
  const boxHeightU = 2 * r + strokeU;

  /** Construction units to canvas units. One-to-one on the 1024 master. */
  const unit = (canvas * logoWidthRatio) / boxWidthU;

  const mainStroke = strokeU * unit;
  const ringStroke = CONSTRUCTION.eyeStroke * unit;

  const arcRadius = r * unit;
  const logoWidth = boxWidthU * unit;
  const logoHeight = boxHeightU * unit;

  /*
   * Centred on the canvas, with no optical correction.
   *
   * The mark used to be nudged left to compensate for the eye's right-hand
   * mass. §4 and §25 both forbid that outright: the eye's displacement is
   * part of the mark, the reference already carries the balance intended, and
   * the whole thing is to be treated as one optical object rather than as
   * pieces to be centred separately.
   */
  const logoX = (canvas - logoWidth) / 2;
  const logoY = (canvas - logoHeight) / 2;

  const centreY = logoY + logoHeight / 2;
  const arcCx = logoX - boxLeftU * unit;

  const theta = rad(CONSTRUCTION.openingHalfAngle);
  const terminalX = arcCx + arcRadius * Math.cos(theta);
  const terminalDy = arcRadius * Math.sin(theta);
  const topTerminal: [number, number] = [terminalX, centreY - terminalDy];
  const bottomTerminal: [number, number] = [terminalX, centreY + terminalDy];

  /*
   * One arc command for the whole body — 256° in a single `A`, which leaves
   * the path with exactly two anchor points. Drawing it as two mirrored
   * halves puts a seam at the leftmost point where the strokes butt together;
   * at small sizes that seam shows as a notch in the silhouette.
   *
   * large-arc-flag 1 because the sweep is past a half turn; sweep-flag 0
   * because the path runs anticlockwise on screen, up over the top of the
   * circle and round the left, from the top terminal to the bottom one.
   */
  const arcD = `M ${round(topTerminal[0])} ${round(topTerminal[1])} A ${round(
    arcRadius,
  )} ${round(arcRadius)} 0 1 0 ${round(bottomTerminal[0])} ${round(
    bottomTerminal[1],
  )}`;

  const eyeOuterRadius = eyeU * unit;
  const eyeCx = arcCx + eyeCxU * unit;
  const eyeRingRadius = eyeOuterRadius - ringStroke / 2;
  const eyeFieldRadius = eyeOuterRadius - ringStroke;

  /*
   * The bridge runs from the arc's centreline to the eye ring's centreline,
   * and is drawn with butt caps rather than the round terminals the arc uses.
   *
   * That is not an inconsistency, it is the join. Both ends finish *inside*
   * another shape's ink — the arc's stroke band on the left, the ring's on
   * the right — so neither cap is ever visible, which is what §6 means by no
   * visible gap and by feeling structurally continuous with the C. A round
   * cap on the right would push a bulge past the ring's inner edge and into
   * the eye's field, the one place on this mark that has to stay clear.
   */
  const bridgeX1 = arcCx - arcRadius;
  const bridgeX2 = eyeCx - eyeRingRadius;
  const bridgeD = `M ${round(bridgeX1)} ${round(centreY)} H ${round(bridgeX2)}`;

  const pupilRadius = CONSTRUCTION.pupilRadius * unit;
  const highlightRadius = pupilRadius * CONSTRUCTION.highlightRatio;

  const highlightPoint = highlight
    ? {
        cx: eyeCx + CONSTRUCTION.highlightOffsetX * unit,
        cy: centreY + CONSTRUCTION.highlightOffsetY * unit,
        r: highlightRadius,
      }
    : null;

  /*
   * Pupil and catchlight are one path with an even-odd fill, so the highlight
   * is a hole rather than a dot painted in the background colour.
   *
   * Two things fall out of that. The mark needs exactly one colour, which is
   * what lets every rendering of it be `currentColor` and follow a theme
   * token — and it is what makes §12's "the pupil/highlight relationship must
   * also invert automatically" true by construction rather than by a second
   * drawing. And the catchlight is physically part of the pupil, so it can
   * never drift off the eye it belongs to.
   */
  const pupilD = highlightPoint
    ? `${circleSubpath(eyeCx, centreY, pupilRadius)} ${circleSubpath(
        highlightPoint.cx,
        highlightPoint.cy,
        highlightPoint.r,
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
    bridge: {
      x1: round(bridgeX1),
      x2: round(bridgeX2),
      y: round(centreY),
      d: bridgeD,
    },
    eye: {
      cx: round(eyeCx),
      cy: round(centreY),
      outerRadius: round(eyeOuterRadius),
      ringRadius: round(eyeRingRadius),
      fieldRadius: round(eyeFieldRadius),
    },
    pupil: {
      cx: round(eyeCx),
      cy: round(centreY),
      r: round(pupilRadius),
      d: pupilD,
    },
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
 * `<circle>` would be shorter to write, but the pupil and its catchlight have
 * to share a path for the even-odd hole to work, and a path cannot hold a
 * `<circle>`.
 */
function circleSubpath(cx: number, cy: number, r: number) {
  return `M ${round(cx - r)} ${round(cy)} a ${round(r)} ${round(
    r,
  )} 0 1 0 ${round(r * 2)} 0 a ${round(r)} ${round(r)} 0 1 0 ${round(
    -r * 2,
  )} 0 Z`;
}

/**
 * The tiers the mark ships in.
 *
 * The same drawing every time — §24 and §18 both insist on that, and nothing
 * here changes a proportion. What changes is how much of its canvas the mark
 * takes, and whether the catchlight is still above a pixel.
 */
export const LOGO_TIERS = {
  /**
   * The app icon, and the master. §3's proportion exactly: a ~44% mark inside
   * a large field of negative space, which §29 names as the defining
   * characteristic of the whole thing.
   */
  appIcon: { logoWidthRatio: APP_ICON_WIDTH_RATIO, highlight: true },

  /**
   * In-app — navigation, rows, cards, roughly 24–96px.
   *
   * More of its canvas, and that is not an enlargement of the logo: §3's
   * ratio is about the icon canvas, where the negative space is the icon's
   * own margin. A mark inside a header row already has the page's padding
   * around it, and drawing it at 44% of a 32px box would leave a 14px mark
   * in a 32px hole.
   */
  inApp: { logoWidthRatio: 0.78, highlight: true },

  /**
   * Favicons and 16–24px marks. Same proportions, per §18 — nothing is
   * thickened and nothing is rebalanced.
   *
   * The catchlight is the one thing dropped, because at 16px it lands on
   * under half a pixel and renders as grey haze inside the pupil rather than
   * as a highlight. The eye itself survives the new proportions unaided: at
   * 16px the ring, the field and the pupil come out at roughly 0.7, 1.5 and
   * 3.2 pixels, which still reads as three bands.
   */
  micro: { logoWidthRatio: 0.88, highlight: false },
} as const satisfies Record<string, ExchangeNotesLogoOptions>;

export type LogoTier = keyof typeof LOGO_TIERS;

/**
 * Brand colour. Two canvases, two marks, and nothing in between — §11 and
 * §17: no gradients, no glow, no tint, no semi-transparent strokes.
 *
 * These are the values behind the --yumi-* tokens in app/globals.css.
 * They live here as well because the standalone asset files cannot read a
 * CSS variable; anything rendered *into the app* should take the token.
 */
export const LOGO_COLORS = {
  /** §11: pure white canvas. */
  canvasLight: "#ffffff",
  /** §11 and §30: pure black. Deliberately not lifted a few points — the
   *  specification asks for #000000 and calls the pair Deep Obsidian. */
  markLight: "#000000",
  /** §12 and §30: jet obsidian. */
  canvasDark: "#0d0d11",
  markDark: "#ffffff",
} as const;

/**
 * The corner radius of the icon *when Exchange Notes draws a preview of it* —
 * onboarding, settings, the install card. §16: ~12% of the icon's width.
 *
 * Never baked into an exported app icon. iOS, Android and every launcher
 * apply their own mask, and a shape rounded twice shows a lighter seam inside
 * the platform's squircle.
 */
export const ICON_PREVIEW_RADIUS_RATIO = 0.12;
