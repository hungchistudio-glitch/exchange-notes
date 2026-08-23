import {
  YUMI_TIERS,
  yumiMarkGeometry,
  type YumiTier,
} from "@/lib/brand/yumiMark";

type YumiLogoProps = {
  className?: string;
  /**
   * Which drawing to use. Not a size — the SVG scales to whatever box it is
   * given — but which compromises the mark makes for the size it will be seen
   * at. See YUMI_TIERS in lib/brand/yumiMark.ts.
   *
   * `medium` is the default because that is what in-app usage is: a mark in a
   * row, a header or a card, somewhere between 24 and 96px.
   */
  tier?: YumiTier;
  /**
   * Dark surfaces take the optically corrected weight — the same drawing with
   * its strokes ~3% lighter, because white on dark blooms. Colour is not part
   * of this: the mark is always `currentColor`, so a surface sets
   * `color: var(--yumi-mark)` and the ink follows the theme on its own.
   */
  variant?: "light" | "dark";
  /**
   * The mark's accessible name. Left out, the SVG is hidden from assistive
   * technology — which is right nearly everywhere it appears, because it sits
   * next to the word "Exchange Notes" and would otherwise be read twice.
   */
  title?: string;
  /**
   * Per-part class names, for animation.
   *
   * The specification asks for the mark to keep its layers — arc, connector,
   * eye, ring, pupil — so it can blink, look around and breathe rather than
   * spin like a loading spinner. These are those layers.
   *
   * The catchlight has no handle of its own on purpose: it is a hole in the
   * pupil rather than a shape sitting on top of it, so it travels with the
   * pupil for free and can never drift off the eye. Move `pupil` and the
   * catchlight comes along.
   */
  parts?: {
    arc?: string;
    connector?: string;
    eye?: string;
    ring?: string;
    pupil?: string;
  };
};

/**
 * The Yumi Essential Mark.
 *
 * Open, connect, see — an arc that does not close, an axis across it, and an
 * eye at the end of that axis. This is the brand's identity: the app icon,
 * the favicon and the brand assets under public/yumi-brand are all this same
 * drawing, generated from the same geometry.
 *
 * It is deliberately not the whole of Yumi. components/ui/ExchangeNotesMark
 * is the character — the one that wears Cosmic Mode, blinks on the splash and
 * lives on the vocabulary screen — and it keeps its gradients, its
 * constellation and its plating. This is the reduced form the character is
 * recognisable *as*: one colour, no gradients, nothing that stops working at
 * 16 pixels.
 */
export default function YumiLogo({
  className,
  tier = "medium",
  variant = "light",
  title,
  parts,
}: YumiLogoProps) {
  const geometry = yumiMarkGeometry({
    weight: variant === "dark" ? "dark" : "regular",
    ...YUMI_TIERS[tier],
  });
  const { arc, connector, eye, pupil, strokes } = geometry;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${geometry.canvas} ${geometry.canvas}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokes.main}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}

      {/* Round terminals: the mark's one rule about how a stroke may end. */}
      <path className={parts?.arc} d={arc.d} strokeLinecap="round" />

      {/* Butt caps, and that is the join rather than an inconsistency — both
          ends of the axis finish inside another shape's ink. See the note in
          lib/brand/yumiMark.ts. */}
      <path className={parts?.connector} d={connector.d} />

      <g className={parts?.eye}>
        <circle
          className={parts?.ring}
          cx={eye.cx}
          cy={eye.cy}
          r={eye.ringRadius}
          strokeWidth={strokes.ring}
        />
        {/* Pupil and catchlight in one even-odd path, so the highlight is a
            hole and the whole mark needs exactly one colour. */}
        <path
          className={parts?.pupil}
          d={pupil.d}
          fill="currentColor"
          fillRule="evenodd"
          stroke="none"
        />
      </g>
    </svg>
  );
}
