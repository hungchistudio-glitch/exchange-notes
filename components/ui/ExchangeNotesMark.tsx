import { useId } from "react";

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
          </>
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

        <g className={pupilClassName}>
          <circle cx="294" cy="172" r="14" fill={inkColor} />
          <circle cx="300" cy="166" r="5" fill={highlightColor} />
        </g>

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
    </svg>
  );
}
