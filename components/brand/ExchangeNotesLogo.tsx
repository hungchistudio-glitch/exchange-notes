import {
  ICON_PREVIEW_RADIUS_RATIO,
  LOGO_COLORS,
  LOGO_TIERS,
  exchangeNotesLogoGeometry,
} from "@/lib/brand/exchangeNotesLogo";

export type ExchangeNotesLogoProps = {
  /**
   * Rendered edge, square. A number is pixels; a string is any CSS length, so
   * a caller can hand it `2rem` or `100%`. Left out, the SVG fills whatever
   * box it is given — which is what most layouts want.
   */
  size?: number | string;
  className?: string;
  /**
   * `mark` is the logo alone on transparency, painted in `currentColor`.
   * `app-icon` is the icon as Exchange Notes previews it: the mark on its
   * canvas, with §16's ~12% corner radius.
   *
   * The rounding is a *preview* affordance and belongs nowhere near an
   * exported OS icon, which stays a full-bleed square for the platform to
   * mask. See renderAppIconSvg.
   */
  variant?: "mark" | "app-icon";
  /**
   * Which colour pair to paint. `system` follows the app's own theme tokens,
   * which is right nearly everywhere; `light` and `dark` pin the pair, for
   * the places that show both at once — settings previews, the brand review
   * screen, marketing.
   *
   * Geometry never varies with this. §24: only the canvas colour and the mark
   * colour change between themes, and nothing else may.
   */
  theme?: "light" | "dark" | "system";
  /**
   * Whether this is ornament or identity. §23: decorative marks are hidden
   * from assistive technology, and a mark standing in for the app itself gets
   * an accessible name.
   *
   * Decorative by default, because the mark nearly always sits beside the
   * words "Exchange Notes" and would otherwise be announced twice.
   */
  decorative?: boolean;
};

/**
 * The Exchange Notes logo.
 *
 * An open C, a bridge across it, and an eye looking out through the mouth.
 * This is the brand's identity — the app icon, the favicon and every asset
 * under public/brand are this same drawing, generated from the same numbers
 * in lib/brand/exchangeNotesLogo.ts.
 *
 * It is deliberately not the whole of Yumi. components/ui/ExchangeNotesMark
 * is the character — the one that wears Cosmic Mode, blinks on the splash and
 * lives on the vocabulary screen — and it keeps its gradients, its
 * constellation and its plating. This is the reduced form the character is
 * recognisable *as*: one colour, no gradients, nothing that stops working at
 * 16 pixels.
 */
export default function ExchangeNotesLogo({
  size,
  className,
  variant = "mark",
  theme = "system",
  decorative = true,
}: ExchangeNotesLogoProps) {
  const appIcon = variant === "app-icon";

  /*
   * The app icon is drawn at its own restrained proportion — a ~44% mark in a
   * large field of negative space, which §29 calls the defining
   * characteristic. A mark placed inline has the page's own padding around it
   * instead, and takes more of its box.
   */
  const geometry = exchangeNotesLogoGeometry(
    appIcon ? LOGO_TIERS.appIcon : LOGO_TIERS.inApp,
  );
  const { arc, bridge, eye, pupil, strokes, canvas } = geometry;

  /*
   * `system` leaves the ink to `currentColor` so a surface sets
   * `color: var(--yumi-mark)` and both modes are handled with no second DOM
   * and no filter: invert(). The pinned themes name the literals instead,
   * which is the whole of the difference between light and dark.
   */
  const markColor =
    theme === "system" ? "currentColor" : LOGO_COLORS[theme === "dark" ? "markDark" : "markLight"];

  const canvasColor =
    theme === "system"
      ? "var(--yumi-canvas)"
      : LOGO_COLORS[theme === "dark" ? "canvasDark" : "canvasLight"];

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${canvas} ${canvas}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke={markColor}
      strokeWidth={strokes.main}
      strokeLinejoin="round"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "Exchange Notes"}
      aria-hidden={decorative ? true : undefined}
      /* Never letterboxed or stretched: §18 requires the mark to scale on one
         axis ratio, so a box of the wrong shape crops rather than distorts. */
      preserveAspectRatio="xMidYMid meet"
    >
      {appIcon ? (
        <rect
          width={canvas}
          height={canvas}
          rx={canvas * ICON_PREVIEW_RADIUS_RATIO}
          ry={canvas * ICON_PREVIEW_RADIUS_RATIO}
          fill={canvasColor}
          stroke="none"
        />
      ) : null}

      {/* Round terminals: the mark's one rule about how a stroke may end. */}
      <path d={arc.d} strokeLinecap="round" />

      {/* Butt caps, and that is the join rather than an inconsistency — both
          ends of the bridge finish inside another shape's ink. See the note in
          lib/brand/exchangeNotesLogo.ts. */}
      <path d={bridge.d} />

      <g>
        <circle
          cx={eye.cx}
          cy={eye.cy}
          r={eye.ringRadius}
          strokeWidth={strokes.ring}
        />
        {/* Pupil and catchlight in one even-odd path, so the highlight is a
            hole and the whole mark needs exactly one colour — which is what
            makes it invert with the theme rather than being re-drawn. */}
        <path d={pupil.d} fill={markColor} fillRule="evenodd" stroke="none" />
      </g>
    </svg>
  );
}
