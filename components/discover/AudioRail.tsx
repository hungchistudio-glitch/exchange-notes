"use client";

import { Play, Square } from "lucide-react";

import type { TranslationDictionary } from "@/lib/i18n/types";
import { getLanguage, type LanguageCode } from "@/lib/languages";

import { DISCOVER_COLORS, type AudioPlaybackMode } from "./types";

type AudioRailProps = {
  copy: TranslationDictionary["discover"];
  isPlaying: boolean;
  progress: number;
  mode: AudioPlaybackMode;
  pair: readonly [LanguageCode, LanguageCode];
  onModeChange: (mode: AudioPlaybackMode) => void;
  onTogglePlay: () => void;
};

// A single consolidated playback control for the featured story — replaces
// four separate per-sentence speaker buttons on this card specifically.
// Per-sentence granularity is preserved in the detail sheet and vocabulary
// drawer; this rail is a simplification of the collapsed/hero view only.
export default function AudioRail({
  copy,
  isPlaying,
  progress,
  mode,
  pair,
  onModeChange,
  onTogglePlay,
}: AudioRailProps) {
  const modes: readonly {
    value: AudioPlaybackMode;
    language: LanguageCode;
  }[] = [
    { value: "primary", language: pair[0] },
    { value: "secondary", language: pair[1] },
  ];

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
        {modes.map((option) => {
          const active = mode === option.value;
          const language = getLanguage(option.language);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onModeChange(option.value)}
              aria-label={language.endonym}
              aria-pressed={active}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[0.65625rem] font-semibold transition-colors"
              style={{
                backgroundColor: active ? DISCOVER_COLORS.accent : "transparent",
                color: active
                  ? DISCOVER_COLORS.onAccent
                  : DISCOVER_COLORS.textSecondary,
              }}
            >
              {language.badge}
            </button>
          );
        })}
      </div>
    </div>
  );
}
