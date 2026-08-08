type ExchangeNotesGlyphProps = {
  className?: string;
  withTile?: boolean;
  /** Background fill, used only when `withTile` is set. */
  tileColor?: string;
  /**
   * What shows through the eye. Set it to the colour of the surface directly
   * behind the glyph and the eye reads as a hole punched through the mark
   * rather than as a light dot.
   *
   * Must stay light. Passing a dark surface colour — which is how the word
   * card originally lost its mark on ink-toned cards — flattens the eye into
   * the body and takes the glyph's most recognisable feature with it.
   */
  eyeColor?: string;
};

/** Brand ink. Fixed rather than themed — the mark reads the same everywhere. */
const INK = "#09090b";

/**
 * The metallic connector, flattened to its midtone. The full mark runs a
 * three-stop gradient here; below ~64px that gradient compresses into about
 * three pixels and reads as a smear rather than as metal.
 */
const BAR = "#c2c4c8";

/** Default eye. Light on every surface — a dark eye collapses the mark. */
const EYE = "#f1f0eb";

/**
 * The mark drawn for small renderings — roughly 20px to 48px.
 *
 * ExchangeNotesMark is authored against a 400-unit viewBox for hero sizes.
 * At a 29px badge it is not merely detailed but wrong: its body carries a
 * four-stop gradient across what becomes a 3.8px stroke, its connector a
 * light-to-dark gradient across 3px, and its eye ring lands at 0.87px. Short
 * gradients read as smudges and sub-pixel strokes as grey haze, which is
 * what makes the badge look dirty rather than merely small.
 *
 * So this is a separate drawing rather than a flag on that one: flat fills,
 * no filters, and a 24-unit grid chosen so every stroke clears one device
 * pixel at the sizes it is actually used. The identity is preserved exactly
 * — dark open body, light bar, light eye looking up and right.
 */
export default function ExchangeNotesGlyph({
  className,
  withTile = false,
  tileColor = "#f5f3ed",
  eyeColor = EYE,
}: ExchangeNotesGlyphProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {withTile ? (
        <rect x="0" y="0" width="24" height="24" rx="5.3" fill={tileColor} />
      ) : null}

      {/* One open curve rather than the full mark's two mirrored arms, which
          met at a seam that showed as a notch once scaled down. */}
      <path
        d="M 17.4,5.2 Q 6.6,5.2 6,12 Q 6.6,18.8 17.4,18.8"
        fill="none"
        stroke={INK}
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Bar keeps its ink outline so it stays defined against a light card
          just as it does against a dark one. */}
      <path
        d="M 6,12 L 14.6,12"
        fill="none"
        stroke={INK}
        strokeWidth="2.9"
        strokeLinecap="round"
      />
      <path
        d="M 6.4,12 L 14.2,12"
        fill="none"
        stroke={BAR}
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      {/* Eye sits in the mouth of the body and knocks a hole through the bar
          running under it, exactly as the full mark does. */}
      <circle cx="16.6" cy="12" r="2.9" fill={eyeColor} />
      <circle
        cx="16.6"
        cy="12"
        r="2.9"
        fill="none"
        stroke={INK}
        strokeWidth="1.05"
      />

      {/* Offset on the same proportion as the full mark — that offset is what
          gives the eye its direction. The full mark's catchlight is dropped:
          at these sizes it lands under half a pixel and reads as a speck. */}
      <circle cx="17.14" cy="11.52" r="1.15" fill={INK} />
    </svg>
  );
}
