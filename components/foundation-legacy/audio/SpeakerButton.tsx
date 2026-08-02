"use client";

import { Volume2 } from "lucide-react";

export type SpeakerButtonVariant = "light" | "dark";

type SpeakerButtonProps = {
  label: string;
  onClick: () => void;
  variant?: SpeakerButtonVariant;
  disabled?: boolean;
  className?: string;
};

export default function SpeakerButton({
  label,
  onClick,
  variant = "light",
  disabled = false,
  className = "",
}: SpeakerButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
        variant === "dark"
          ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
          : "border-neutral-200 bg-white text-neutral-950 hover:bg-neutral-100"
      } ${className}`}
    >
      <Volume2 size={17} aria-hidden="true" />
    </button>
  );
}
