type MarkProps = {
  className?: string;
};

/**
 * Two passes of a wobbling underline, the second shorter, as if gone over
 * twice.
 *
 * The only drawn mark left in the tour. The icon steps present themselves in
 * the app's own orbital language now, which is the more precise register — but
 * a headline still deserves one line that a machine would not have made, and
 * this is it. Drawn rather than set in a handwriting face: a Latin script font
 * would style half the app, and app/layout.tsx already refuses to self-host a
 * CJK family for the megabytes it costs.
 */
export function SketchUnderline({ className = "" }: MarkProps) {
  return (
    <svg
      viewBox="0 0 200 14"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M4 8c34-4 71-5 108-3 26 1 52 3 84 1"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M22 12c40-3 82-4 124-2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}
