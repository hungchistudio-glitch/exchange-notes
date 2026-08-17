"use client";

import { Volume2 } from "lucide-react";
import { speak } from "@/lib/speech";

type VocabularySpeechButtonProps = {
  text: string | null | undefined;
  language: "en-US" | "zh-TW";
  label: string;
  size?: "sm" | "md";
  className?: string;
  /** "secondary" (default) is the current subtle ghost style, used
   * everywhere that isn't language-hierarchy-aware. "primary" is a
   * solid, higher-contrast treatment for whichever language is the
   * current visual hero (see isLearningChinese) — the demoted language's
   * button should stay "secondary". */
  prominence?: "primary" | "secondary";
};

export default function VocabularySpeechButton({
  text,
  language,
  label,
  size = "md",
  className = "",
  prominence = "secondary",
}: VocabularySpeechButtonProps) {
  const value = text?.trim();

  if (!value) return null;

  const sizeClasses =
    size === "sm"
      ? "h-9 w-9"
      : "h-10 w-10";

  const iconSize = size === "sm" ? 15 : 16;

  const prominenceClasses =
    prominence === "primary"
      ? "border border-black bg-black text-white hover:bg-black/85"
      : "border border-black/[0.07] bg-black/[0.035] text-ink-soft hover:border-black/[0.12] hover:bg-black/[0.07] hover:text-black";

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        speak(value, language);
      }}
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-full",
        prominenceClasses,
        "transition duration-200",
        "active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20",
        sizeClasses,
        className,
      ].join(" ")}
      aria-label={label}
      title={label}
    >
      <Volume2 size={iconSize} strokeWidth={1.9} />
    </button>
  );
}
