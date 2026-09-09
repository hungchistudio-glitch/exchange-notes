"use client";

import { Check, LoaderCircle, RotateCcw, Volume2 } from "lucide-react";

import type { PlaybackPhase } from "@/hooks/pronunciation/usePronunciationPlayback";

type Size = "sm" | "md";

type AudioButtonProps = {
  label: string;
  onClick: () => void;
  phase?: PlaybackPhase;
  /** A label used in place of `label` once playback has failed. */
  failedLabel?: string;
  size?: Size;
  disabled?: boolean;
  className?: string;
};

const TONE: Record<PlaybackPhase, string> = {
  loading: "border-line bg-white text-ink-strong",
  playing: "border-black bg-black text-white",
  done: "border-emerald-300 bg-emerald-50 text-emerald-700",
  error: "border-red-300 bg-red-50 text-red-600",
};

/**
 * A speaker, with the four things playback can be doing.
 *
 * Icon-only, because these appear beside every example word and a row of
 * text buttons would drown the words themselves — so the state has to be
 * carried by the icon and the label by `aria-label`. Both sizes clear 44px
 * of hit area; the small one just draws a smaller circle inside it.
 */
export default function AudioButton({
  label,
  onClick,
  phase,
  failedLabel,
  size = "md",
  disabled = false,
  className = "",
}: AudioButtonProps) {
  const iconSize = size === "sm" ? 15 : 18;

  const shell = [
    // The tap target is always at least 44px; `size` changes the visible
    // circle, never the area a finger has to find.
    "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full",
    "transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black",
    disabled ? "opacity-40" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const circle = [
    "flex items-center justify-center rounded-full border",
    size === "sm" ? "h-9 w-9" : "h-11 w-11",
    phase ? TONE[phase] : "border-line bg-white text-black",
  ].join(" ");

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={phase === "error" && failedLabel ? failedLabel : label}
      className={shell}
    >
      <span className={circle} aria-hidden="true">
        <PhaseIcon phase={phase} size={iconSize} />
      </span>
    </button>
  );
}

function PhaseIcon({ phase, size }: { phase?: PlaybackPhase; size: number }) {
  if (phase === "loading") {
    return <LoaderCircle size={size} strokeWidth={1.8} className="animate-spin" />;
  }
  if (phase === "playing") {
    return <Volume2 size={size} strokeWidth={1.8} className="animate-pulse" />;
  }
  if (phase === "done") {
    return <Check size={size} strokeWidth={2.2} />;
  }
  if (phase === "error") {
    return <RotateCcw size={size} strokeWidth={1.8} />;
  }
  return <Volume2 size={size} strokeWidth={1.8} />;
}

/**
 * The same speaker, drawn but not clickable.
 *
 * For rows where the whole row is already the button — an example word, a
 * side of a minimal pair. A real AudioButton there would be a `<button>`
 * inside a `<button>`, which is invalid HTML: the browser closes the outer
 * one at the inner tag, and the second half of the row silently stops being
 * part of the control.
 */
export function AudioGlyph({
  phase,
  size = "md",
}: {
  phase?: PlaybackPhase;
  size?: Size;
}) {
  return (
    <span
      aria-hidden="true"
      className={[
        "flex items-center justify-center rounded-full border",
        size === "sm" ? "h-9 w-9" : "h-11 w-11",
        phase ? TONE[phase] : "border-line bg-white text-black",
      ].join(" ")}
    >
      <PhaseIcon phase={phase} size={size === "sm" ? 15 : 18} />
    </span>
  );
}
