"use client";

import { Volume2 } from "lucide-react";

import { speak } from "@/lib/speech";

type SpeakerButtonProps = {
  text: string;
  language: "en-US" | "zh-TW";
  label: string;
  compact?: boolean;
  subtle?: boolean;
  className?: string;
};

export default function SpeakerButton({
  text,
  language,
  label,
  compact = false,
  subtle = false,
  className = "",
}: SpeakerButtonProps) {
  const speakableText = text.trim();

  if (!speakableText) return null;

  return (
    <button
      type="button"
      onClick={() => speak(speakableText, language)}
      aria-label={label}
      title={label}
      className={`flex shrink-0 items-center justify-center rounded-full transition-all active:scale-95 ${
        compact ? "h-8 w-8" : "h-10 w-10"
      } ${
        subtle
          ? "bg-transparent text-black/35 hover:bg-black/[0.045] hover:text-black/65"
          : "bg-[#f3f0e9] text-black/65 hover:bg-[#e9e5dc]"
      } ${className}`}
    >
      <Volume2 size={compact ? 14 : 16} strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}
