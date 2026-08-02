import { useId } from "react";

type ExchangeNotesMarkProps = {
  className?: string;
  pupilClassName?: string;
  upperLidClassName?: string;
  lowerLidClassName?: string;
  surfaceColor?: string;
  highlightColor?: string;
  withTile?: boolean;
};

export default function ExchangeNotesMark({
  className,
  pupilClassName,
  upperLidClassName,
  lowerLidClassName,
  surfaceColor = "#f5f3ed",
  highlightColor = "#ffffff",
  withTile = false,
}: ExchangeNotesMarkProps) {
  const rawId = useId();
  const eyeClipId = `exchange-notes-eye-${rawId.replace(/:/g, "")}`;

  return (
    <svg
      className={className}
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
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

      <path
        d="M 300,70 Q 110,70 100,180"
        fill="none"
        stroke="currentColor"
        strokeWidth="52"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M 100,180 Q 110,320 300,320"
        fill="none"
        stroke="currentColor"
        strokeWidth="52"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M 100,180 L 250,180"
        fill="none"
        stroke="currentColor"
        strokeWidth="52"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx="285" cy="180" r="40" fill={surfaceColor} />

      <g clipPath={`url(#${eyeClipId})`}>
        <g className={pupilClassName}>
          <circle cx="294" cy="172" r="14" fill="currentColor" />
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
        stroke="currentColor"
        strokeWidth="12"
      />
    </svg>
  );
}
