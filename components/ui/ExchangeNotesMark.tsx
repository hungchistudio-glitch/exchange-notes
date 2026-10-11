import { useId } from "react";

/*
  The gloss finish's sheen: the body's path, stroked narrower and lighter
  toward the upper left, layer over layer, so the light falls off across the
  tube the way it does on the home's 3D Yumi instead of sitting on it as a
  painted stripe. [width, opacity, dx, dy]
*/
const GLOSS_PATH = "M 300,70 Q 110,70 100,180 Q 110,320 300,320";
const GLOSS_SHEEN = [
  [36, 0.035, -2, -3],
  [28, 0.04, -3, -5],
  [21, 0.05, -4, -6.5],
  [15, 0.06, -5, -8],
  [10, 0.08, -6, -9.5],
  [6, 0.11, -6.5, -10.5],
  [2.5, 0.2, -7, -11.5],
] as const;

/**
 * The gloss finish on Yumi's body, for any drawing of her that uses the
 * brand geometry (here, and the pronunciation coach's face). Render it inside
 * a mask of the body's own strokes; it is hidden until app/tactile.css shows
 * it.
 */
export function YumiBodyGloss() {
  return (
    <g data-mark-part="gloss" display="none" fill="none" strokeLinecap="round">
      <path
        d={GLOSS_PATH}
        stroke="#000000"
        strokeOpacity="0.4"
        strokeWidth="22"
        transform="translate(9 13)"
      />
      <path
        d={GLOSS_PATH}
        stroke="#b8b2a6"
        strokeOpacity="0.16"
        strokeWidth="4"
        transform="translate(12 19)"
      />
      {GLOSS_SHEEN.map(([width, opacity, dx, dy]) => (
        <path
          key={width}
          d={GLOSS_PATH}
          stroke="#ffffff"
          strokeOpacity={opacity}
          strokeWidth={width}
          transform={`translate(${dx} ${dy})`}
        />
      ))}
    </g>
  );
}

type ExchangeNotesMarkProps = {
  className?: string;
  pupilClassName?: string;
  upperLidClassName?: string;
  lowerLidClassName?: string;
  surfaceColor?: string;
  highlightColor?: string;
  withTile?: boolean;
  /*
   * Yumi's cosmic refit. Off by default, and that default is the whole point:
   * this mark is the app's identity and appears on the standard home, in
   * Messages and on the splash. Cosmic Mode adds layers on top of the same
   * body, eye and constellation rather than swapping the character out.
   */
  cosmic?: boolean;
  /*
   * How lit the energy seam and the active constellation points are, 0–1.
   * Idle sits low on purpose; only genuinely notable moments go high, so the
   * brightness still means something when it arrives.
   */
  energy?: number;
  /** Lets the consumer animate the iris — see the pupilClassName precedent. */
  irisClassName?: string;
  /*
   * Two more animation handles, on the same precedent and cosmic-only.
   *
   * Both exist here rather than as overlays in the consumer because both have
   * to be clipped by shapes only this file knows: the sweep by the body mask,
   * so a band of light crosses Yumi's silhouette instead of a square around
   * it, and the gleam by the eye's own clip, so a reflection stays on the
   * lens. Neither is reachable from outside the SVG.
   */
  sweepClassName?: string;
  gleamClassName?: string;
};

export default function ExchangeNotesMark({
  className,
  pupilClassName,
  upperLidClassName,
  lowerLidClassName,
  surfaceColor = "#f5f3ed",
  highlightColor = "#ffffff",
  withTile = false,
  cosmic = false,
  energy = 0,
  irisClassName,
  sweepClassName,
  gleamClassName,
}: ExchangeNotesMarkProps) {
  const rawId = useId();
  const idBase = rawId.replace(/:/g, "");
  const eyeClipId = `exchange-notes-eye-${idBase}`;
  const bodyMaskId = `exchange-notes-body-${idBase}`;
  const bodyGradientId = `exchange-notes-body-gradient-${idBase}`;
  const connectorGradientId = `exchange-notes-connector-${idBase}`;
  const nebulaGradientId = `exchange-notes-nebula-${idBase}`;
  const nebulaBlurId = `exchange-notes-nebula-blur-${idBase}`;
  const inkColor = "#09090b";

  // The refit's own ids, so two marks on one screen never share a gradient.
  const shellGradientId = `exchange-notes-shell-${idBase}`;
  const seamGradientId = `exchange-notes-seam-${idBase}`;
  const sweepGradientId = `exchange-notes-sweep-${idBase}`;
  const gleamGradientId = `exchange-notes-gleam-${idBase}`;
  const scleraGradientId = `exchange-notes-sclera-${idBase}`;

  /*
   * Clamped, then mapped onto the brief's two bands: 10–18% at rest and up to
   * 50% when something is actually happening. Nothing here reaches full
   * opacity — a seam at 100% stops reading as contained energy and starts
   * reading as a light strip stuck to the body.
   */
  const energyLevel = Math.max(0, Math.min(1, energy));
  const seamOpacity = 0.1 + energyLevel * 0.4;
  const platingOpacity = cosmic ? 0.055 + energyLevel * 0.035 : 0;
  const cosmicCyan = "#4de3f0";

  return (
    <svg
      className={className}
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={bodyGradientId}
          x1="75"
          y1="62"
          x2="318"
          y2="330"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#050506" />
          <stop offset="0.48" stopColor="#202126" />
          <stop offset="0.72" stopColor="#101114" />
          <stop offset="1" stopColor="#020203" />
        </linearGradient>

        <linearGradient
          id={connectorGradientId}
          x1="105"
          y1="180"
          x2="252"
          y2="180"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#5d5f64" />
          <stop offset="0.48" stopColor="#d4d5d7" />
          <stop offset="1" stopColor="#62646a" />
        </linearGradient>

        <radialGradient
          id={nebulaGradientId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(172 198) rotate(42) scale(186 126)"
        >
          <stop offset="0" stopColor="#f5f5f4" stopOpacity="0.40" />
          <stop offset="0.38" stopColor="#8b8d93" stopOpacity="0.28" />
          <stop offset="0.78" stopColor="#34353a" stopOpacity="0.12" />
          <stop offset="1" stopColor="#111216" stopOpacity="0" />
        </radialGradient>

        <filter
          id={nebulaBlurId}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feGaussianBlur stdDeviation="7" />
        </filter>

        <mask
          id={bodyMaskId}
          maskUnits="userSpaceOnUse"
          x="40"
          y="25"
          width="310"
          height="340"
        >
          <rect x="40" y="25" width="310" height="340" fill="black" />
          <path
            d="M 300,70 Q 110,70 100,180"
            fill="none"
            stroke="white"
            strokeWidth="52"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 100,180 Q 110,320 300,320"
            fill="none"
            stroke="white"
            strokeWidth="52"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </mask>

        {cosmic && (
          <>
            {/*
              Black titanium rather than a new colour: the body is already
              near-black, so the refit is a shift in *temperature* and in the
              sharpness of the highlight, not a repaint. Warm graphite becomes
              cool gunmetal with a harder chrome edge.
            */}
            <linearGradient
              id={shellGradientId}
              x1="75"
              y1="62"
              x2="318"
              y2="330"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#04060a" />
              <stop offset="0.34" stopColor="#1b2330" />
              <stop offset="0.52" stopColor="#2b3546" />
              <stop offset="0.7" stopColor="#0d131c" />
              <stop offset="1" stopColor="#020407" />
            </linearGradient>

            {/* The seam is brightest where the C turns hardest — that is where
                a real energy channel would be under the most load. */}
            <linearGradient
              id={seamGradientId}
              x1="300"
              y1="70"
              x2="120"
              y2="320"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor={cosmicCyan} stopOpacity="0.25" />
              <stop offset="0.45" stopColor={cosmicCyan} stopOpacity="1" />
              <stop offset="1" stopColor={cosmicCyan} stopOpacity="0.3" />
            </linearGradient>

            {/* The scan pass: cyan at the edges with a near-white core, so the
                band reads as light travelling through the shell rather than a
                flat cyan rectangle sliding over it. */}
            <linearGradient id={sweepGradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={cosmicCyan} stopOpacity="0" />
              <stop offset="0.4" stopColor={cosmicCyan} stopOpacity="0.5" />
              <stop offset="0.52" stopColor="#eafcff" stopOpacity="0.92" />
              <stop offset="0.64" stopColor={cosmicCyan} stopOpacity="0.45" />
              <stop offset="1" stopColor={cosmicCyan} stopOpacity="0" />
            </linearGradient>

            {/* The gleam is white rather than cyan. It is a reflection off the
                lens, not something the lens is emitting. */}
            <linearGradient id={gleamGradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </>
        )}

        {/* The gloss finish's eye: a shallow cup, so the sclera reads as a
            lens set into the body rather than a disc painted on it. */}
        {!cosmic && (
          <radialGradient id={scleraGradientId} cx="0.42" cy="0.38" r="0.62">
            <stop offset="0.55" stopColor="#000000" stopOpacity="0" />
            <stop offset="1" stopColor="#3a342b" stopOpacity="0.32" />
          </radialGradient>
        )}

        <clipPath id={eyeClipId}>
          <circle cx="285" cy="180" r="39" />
        </clipPath>
      </defs>

      {withTile ? (
        <rect
          x="0"
          y="0"
          width="400"
          height="400"
          rx="88"
          fill={surfaceColor}
        />
      ) : null}

      {[
        "M 300,70 Q 110,70 100,180",
        "M 100,180 Q 110,320 300,320",
      ].map((path) => (
        <g key={path}>
          <path
            d={path}
            fill="none"
            stroke={inkColor}
            strokeWidth="60"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={path}
            fill="none"
            stroke={`url(#${bodyGradientId})`}
            strokeWidth="52"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ))}

      <path
        d="M 100,180 L 250,180"
        fill="none"
        stroke={inkColor}
        strokeWidth="50"
        strokeLinecap="round"
      />
      <path
        d="M 100,180 L 250,180"
        fill="none"
        stroke={`url(#${connectorGradientId})`}
        strokeWidth="42"
        strokeLinecap="round"
      />

      <g mask={`url(#${bodyMaskId})`}>
        <ellipse
          data-mark-part="nebula"
          cx="174"
          cy="198"
          rx="174"
          ry="126"
          fill={`url(#${nebulaGradientId})`}
          filter={`url(#${nebulaBlurId})`}
        />

        <path
          d="M 300,70 Q 110,70 100,180 Q 110,320 300,320"
          fill="none"
          stroke="white"
          strokeOpacity="0.11"
          strokeWidth="10"
          strokeLinecap="round"
          filter={`url(#${nebulaBlurId})`}
        />
        <path
          d="M 300,70 Q 110,70 100,180 Q 110,320 300,320"
          fill="none"
          stroke="white"
          strokeOpacity="0.34"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {cosmic && (
          <>
            {/* The cool shell, laid over the warm body inside the same mask so
                the silhouette cannot change by a single pixel. */}
            <path
              d="M 300,70 Q 110,70 100,180 Q 110,320 300,320"
              fill="none"
              stroke={`url(#${shellGradientId})`}
              strokeWidth="52"
              strokeLinecap="round"
              strokeOpacity="0.82"
            />

            {/*
              Segmented plating.
              
              Drawn on a stroke narrower than the body (34 against 52) so the
              seams only cross the middle band and the tube keeps smooth edges.
              At full width the dashes spanned the whole tube and read as ladder
              rungs — a zip down Yumi's back, which is exactly the robot the
              brief rules out. Confined to the centre they read as panel lines
              catching the light, and the silhouette stays soft.
            */}
            <path
              d="M 300,70 Q 110,70 100,180 Q 110,320 300,320"
              fill="none"
              stroke="white"
              strokeOpacity={platingOpacity}
              strokeWidth="34"
              strokeDasharray="0.9 13"
              strokeLinecap="butt"
            />

            {/*
              The energy seam, on the inner wall of the C. Offset toward the
              inside and held there by the body mask, so it runs along the
              channel instead of floating over the middle of the tube.
            */}
            <path
              d="M 300,70 Q 110,70 100,180 Q 110,320 300,320"
              fill="none"
              stroke={`url(#${seamGradientId})`}
              strokeOpacity={seamOpacity}
              strokeWidth="4.4"
              strokeLinecap="round"
              transform="translate(13 0)"
            />
          </>
        )}

        <g
          data-mark-part="constellation"
          fill="none"
          stroke="white"
          strokeOpacity="0.30"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 274,75 L 238,80 L 205,91 L 171,108 L 143,132" />
          <path d="M 112,155 L 101,181 L 108,211 L 124,246 L 151,276" />
          <path d="M 151,276 L 190,301 L 239,314 L 282,319" />
          <path d="M 205,91 L 216,73 M 143,132 L 126,121 M 124,246 L 105,252 M 239,314 L 252,299" />
        </g>

        <g data-mark-part="constellation">
        {[
          [274, 75, 2.8],
          [238, 80, 1.7],
          [205, 91, 2.2],
          [171, 108, 1.6],
          [143, 132, 2.5],
          [112, 155, 1.5],
          [101, 181, 3.0],
          [108, 211, 1.8],
          [124, 246, 2.6],
          [151, 276, 1.6],
          [190, 301, 2.4],
          [239, 314, 1.7],
          [282, 319, 3.0],
          [216, 73, 1.3],
          [126, 121, 1.2],
          [105, 252, 1.4],
          [252, 299, 1.3],
        ].map(([cx, cy, radius]) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r={radius}
            /*
             * Two of the constellation take on the energy colour and grow very
             * slightly — the same seven points, reporting. Lighting all of them
             * would read as a string of fairy lights rather than as a system
             * with something to say.
             */
            fill={
              cosmic && energyLevel > 0.35 && (cx === 101 || cx === 205)
                ? cosmicCyan
                : "white"
            }
            fillOpacity={
              cosmic && energyLevel > 0.35 && (cx === 101 || cx === 205)
                ? 1
                : 0.86
            }
          />
        ))}
        </g>

        {/*
          The gloss finish: the home's 3D Yumi, as paint (Tactile Worlds, Chi
          2026-10-11). A tube lit from the upper left: the shaded side, a
          broad sheen and a narrow specular line on the lit side, and a rim
          of reflected light along the bottom edge. Each is the body's own
          path, offset and held inside the body mask, so the silhouette and
          every animation hook stay exactly where they were.

          Hidden unless app/tactile.css shows it (Standard Mode, inside the
          app), so the brand mark on the splash, the landing page and in
          Cosmic is untouched.
        */}
        {!cosmic && <YumiBodyGloss />}

        {/*
          The scan pass, last inside the mask so it crosses everything on the
          body — shell, plating, seam and constellation alike — and nothing
          outside it. Tilted to run with the diagonal the seam gradient
          already established rather than straight down the screen.

          It renders at zero opacity and stays there unless a consumer passes a
          class that animates it. A mark on the splash screen or in Messages
          gets no sweep, which is correct: this is the deck's behaviour, not
          the identity's.
        */}
        {cosmic && (
          <g transform="rotate(-14 200 200)">
            <rect
              className={sweepClassName}
              x="140"
              y="-120"
              width="118"
              height="640"
              fill={`url(#${sweepGradientId})`}
              opacity="0"
            />
          </g>
        )}
      </g>

      <circle cx="285" cy="180" r="40" fill={surfaceColor} />

      <g clipPath={`url(#${eyeClipId})`}>
        {/*
          The optics go *under* the pupil group, so the eye is still an eye
          with instrumentation behind it rather than a lens with a dot painted
          on. Order is the whole difference: sclera, then rings, then the
          living pupil and its catchlight on top.
        */}
        {cosmic && (
          <g className={irisClassName} style={{ transformOrigin: "285px 180px" }}>
            {/* Iris ring — one hairline, close in. */}
            <circle
              cx="285"
              cy="180"
              r="27"
              fill="none"
              stroke={cosmicCyan}
              strokeOpacity={0.16 + energyLevel * 0.34}
              strokeWidth="1"
            />

            {/* Micro focusing rings: four arcs, not four circles. A broken
                ring is a mechanism finding focus; a closed one is a target. */}
            <circle
              cx="285"
              cy="180"
              r="33"
              fill="none"
              stroke={cosmicCyan}
              strokeOpacity={0.12 + energyLevel * 0.28}
              strokeWidth="0.9"
              strokeDasharray="9 8"
            />

            {/* Scanner aperture — the outermost, faintest trace. */}
            <circle
              cx="285"
              cy="180"
              r="37"
              fill="none"
              stroke={cosmicCyan}
              strokeOpacity={0.08 + energyLevel * 0.22}
              strokeWidth="0.8"
              strokeDasharray="2 6"
            />
          </g>
        )}

        {!cosmic && (
          <circle
            data-mark-part="gloss"
            display="none"
            cx="285"
            cy="180"
            r="40"
            fill={`url(#${scleraGradientId})`}
          />
        )}

        <g className={pupilClassName}>
          <circle cx="294" cy="172" r="14" fill={inkColor} />
          <circle cx="300" cy="166" r="5" fill={highlightColor} />
        </g>

        {/*
          The gleam sits above the pupil and below the lids, which is the only
          order that reads correctly: a reflection is on the front of the lens,
          so it passes over the pupil — but an eyelid closes in front of the
          lens, so it passes over the reflection.
        */}
        {cosmic && (
          <g transform="rotate(-22 285 180)">
            <rect
              className={gleamClassName}
              x="273"
              y="118"
              width="24"
              height="124"
              fill={`url(#${gleamGradientId})`}
              opacity="0"
            />
          </g>
        )}

        <rect
          className={upperLidClassName}
          x="245"
          y="100"
          width="80"
          height="120"
          fill={surfaceColor}
        />

        <rect
          className={lowerLidClassName}
          x="245"
          y="215"
          width="80"
          height="25"
          fill={surfaceColor}
        />
      </g>

      <circle
        cx="285"
        cy="180"
        r="40"
        fill="none"
        stroke={inkColor}
        strokeWidth="12"
      />

      {/* The gloss finish on the rod and the eye's bezel: one line of light
          each, where the upper-left light would catch a polished edge. */}
      {!cosmic && (
        <g data-mark-part="gloss" display="none" fill="none" strokeLinecap="round">
          <path d="M 112,170 L 236,170" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="4" />
          <path d="M 252,158 A 40 40 0 0 1 300,141" stroke="#ffffff" strokeOpacity="0.38" strokeWidth="3" />
        </g>
      )}

      {/*
        The illuminated ring, outside the housing.

        Last in the file because it is the outermost thing on the eye: a
        hairline of light hugging the black bezel, the way a lens assembly is
        lit from the inside of the body it is set into. It sits just past the
        housing's outer edge (r 40 + half of a 12-wide stroke = 46) so the two
        touch without the cyan bleeding over the black.

        This is the one part of the eye that reports state. Its brightness is
        the same `energy` every other lit surface on Yumi reads, so the ring,
        the seam and the constellation rise and fall together — one system
        answering, rather than three effects that happen to be cyan.
      */}
      {cosmic && (
        <circle
          cx="285"
          cy="180"
          r="47.2"
          fill="none"
          stroke={cosmicCyan}
          strokeOpacity={0.3 + energyLevel * 0.5}
          strokeWidth="2"
        />
      )}
    </svg>
  );
}
