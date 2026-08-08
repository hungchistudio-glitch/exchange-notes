import { useId } from "react";

type ExchangeNotesMarkProps = {
  className?: string;
  pupilClassName?: string;
  upperLidClassName?: string;
  lowerLidClassName?: string;
  surfaceColor?: string;
  highlightColor?: string;
  withTile?: boolean;
  /**
   * Drops the nebula, constellation and star field.
   *
   * Those details are authored against a 400-unit viewBox, so below roughly
   * 64px they fall under one device pixel — a 1.25-unit stroke lands at
   * 0.09px at 29px — and the renderer resolves them as grey haze rather than
   * as detail. Removing them at small sizes is what makes the mark look
   * sharp; keeping them is what makes it look low-resolution.
   */
  simplified?: boolean;
};

export default function ExchangeNotesMark({
  className,
  pupilClassName,
  upperLidClassName,
  lowerLidClassName,
  surfaceColor = "#f5f3ed",
  highlightColor = "#ffffff",
  withTile = false,
  simplified = false,
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

      {simplified ? null : (
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
            fill="white"
            fillOpacity="0.86"
          />
        ))}
      </g>
      )}

      <circle cx="285" cy="180" r="40" fill={surfaceColor} />

      <g clipPath={`url(#${eyeClipId})`}>
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
