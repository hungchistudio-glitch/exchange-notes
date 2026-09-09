"use client";

import { Play, Square } from "lucide-react";

import type { TranslationDictionary } from "@/lib/i18n/types";

import { DISCOVER_COLORS, type AudioPlaybackMode } from "./types";

type AudioRailProps = {
  copy: TranslationDictionary["discover"];
  isPlaying: boolean;
  progress: number;
  mode: AudioPlaybackMode;
  onModeChange: (mode: AudioPlaybackMode) => void;
  onTogglePlay: () => void;
};

const MODES: {
  value: AudioPlaybackMode;
  labelKey: "languageEnglish" | "languageChinese";
  shortKey: "languageEnglishShort" | "languageChineseShort";
}[] = [
  { value: "en", labelKey: "languageEnglish", shortKey: "languageEnglishShort" },
  { value: "zh", labelKey: "languageChinese", shortKey: "languageChineseShort" },
];

// A single consolidated playback control for the featured story — replaces
// four separate per-sentence speaker buttons on this card specifically.
// Per-sentence granularity is preserved in the detail sheet and vocabulary
// drawer; this rail is a simplification of the collapsed/hero view only.
export default function AudioRail({
  copy,
  isPlaying,
  progress,
  mode,
  onModeChange,
  onTogglePlay,
}: AudioRailProps) {
  return (
    <div
      className="mt-5 flex items-center gap-2.5 rounded-full p-1.5"
      style={{ backgroundColor: DISCOVER_COLORS.accentSoft }}
    >
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={isPlaying ? copy.stopStory : copy.playFullStoryAriaLabel}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-transform active:scale-95"
        style={{ backgroundColor: DISCOVER_COLORS.accent }}
      >
        {isPlaying ? (
          <Square size={13} strokeWidth={2} fill="currentColor" />
        ) : (
          <Play size={14} strokeWidth={2} fill="currentColor" className="ml-0.5" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className="truncate text-[0.75rem] font-medium"
          style={{ color: DISCOVER_COLORS.accent }}
        >
          {isPlaying ? copy.stopStory : copy.playFullStory}
        </p>

        <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-white/70">
          <div
            className="h-full rounded-full transition-[width] duration-150 ease-linear"
            style={{
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: DISCOVER_COLORS.accent,
            }}
          />
        </div>
      </div>

      <div
        className="flex shrink-0 items-center gap-0.5 rounded-full p-0.5"
        style={{ backgroundColor: DISCOVER_COLORS.selected }}
      >
        {MODES.map((option) => {
          const active = mode === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onModeChange(option.value)}
              aria-label={copy[option.labelKey]}
              aria-pressed={active}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[0.65625rem] font-semibold transition-colors"
              style={{
                backgroundColor: active ? DISCOVER_COLORS.accent : "transparent",
                color: active
                  ? DISCOVER_COLORS.onAccent
                  : DISCOVER_COLORS.textSecondary,
              }}
            >
              {copy[option.shortKey]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
