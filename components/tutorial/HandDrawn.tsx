import type { ReactNode } from "react";

/*
 * The hand-drawn feel is carried by these marks rather than by a handwriting
 * typeface. A Latin script font would only style half the app — app/layout.tsx
 * already avoids self-hosting a CJK family because of the megabytes involved —
 * so drawing the annotation instead keeps English and 繁體中文 looking like the
 * same lesson.
 *
 * Every path is deliberately slightly off: the circles do not close, the
 * underlines wobble, the frames have unequal corners. That irregularity is the
 * whole effect. Strokes use currentColor so a mark inherits whatever it is
 * annotating.
 */

type MarkProps = {
  className?: string;
};

/** An open ellipse, drawn as if circling something on paper. */
export function SketchCircle({ className = "" }: MarkProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M60 9c26 1 47 20 50 42 3 24-14 47-40 54-27 7-53-6-60-29C3 53 18 21 46 12c5-2 10-3 15-3"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Two passes of a wobbling underline, the second shorter, as if gone over twice. */
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

/** A curving arrow with a two-stroke head — the "look here" mark. */
export function SketchArrow({ className = "" }: MarkProps) {
  return (
    <svg
      viewBox="0 0 80 60"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M6 8c14 6 26 17 33 30 3 6 5 12 6 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M33 46c4 3 8 6 12 8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M45 40c-1 6-1 11 0 16"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * A wobbling rounded frame. Sized by the box it is placed in, so it stretches
 * with the content rather than needing a fixed aspect ratio.
 */
export function SketchFrame({ className = "" }: MarkProps) {
  return (
    <svg
      viewBox="0 0 200 120"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M14 9c38-3 78-4 118-3 24 1 46 1 54 4 5 8 6 24 5 44 0 20-1 40-4 51-30 4-72 5-116 4-24 0-45-1-54-4-5-13-6-32-5-52 0-19 1-36 2-44"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * The app's own icon, circled the way you would ring something in a notebook.
 * Showing the real component matters: the thing being explained is the thing
 * the user is about to tap, not a drawing of it.
 */
export function CircledIcon({
  children,
  tone = "ink",
}: {
  children: ReactNode;
  tone?: "ink" | "amber" | "emerald";
}) {
  const ringColor =
    tone === "amber"
      ? "text-amber-500/70"
      : tone === "emerald"
        ? "text-emerald-500/70"
        : "text-black/25";

  return (
    <span className="relative inline-flex h-24 w-24 shrink-0 items-center justify-center">
      <SketchCircle
        className={`absolute inset-0 h-full w-full ${ringColor}`}
      />
      <span className="flex h-11 w-11 items-center justify-center text-black">
        {children}
      </span>
    </span>
  );
}
