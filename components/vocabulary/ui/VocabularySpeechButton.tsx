"use client";

import { SpeakKey } from "@/components/speech/Spoken";
import type { SpeechLanguage } from "@/lib/speech";

type VocabularySpeechButtonProps = {
  text: string | null | undefined;
  language: SpeechLanguage;
  label: string;
  size?: "sm" | "md";
  className?: string;
  /** "secondary" (default) is the current subtle ghost style, used
   * everywhere that isn't language-hierarchy-aware. "primary" is a
   * solid, higher-contrast treatment for whichever language is the
   * current visual hero (see getVocabularyCardSides) — the demoted language's
   * button should stay "secondary". */
  prominence?: "primary" | "secondary";
};

/**
 * A vocabulary card's speaker: ▶, ■ while it plays, and the word or sentence
 * it reads lit as it is said wherever it is shown (Chi, 2026-11-14). It
 * sits on a card that opens when tapped, so its own tap stops there.
 */
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

  const iconSize = size === "sm" ? 13 : 14;

  const prominenceClasses =
    prominence === "primary"
      ? "border border-black bg-black text-white hover:bg-black/85"
      : "border border-black/[0.07] bg-black/[0.035] text-ink-soft hover:border-black/[0.12] hover:bg-black/[0.07] hover:text-black";

  return (
    <SpeakKey
      text={value}
      lang={language}
      label={label}
      isolate
      iconSize={iconSize}
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-full",
        prominenceClasses,
        "transition duration-200",
        "active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20",
        sizeClasses,
        className,
      ].join(" ")}
    />
  );
}
