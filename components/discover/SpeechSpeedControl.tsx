"use client";

import { Gauge, Rabbit, Turtle } from "lucide-react";

import type { TranslationDictionary } from "@/lib/i18n/types";

import { DISCOVER_COLORS, type SpeechRate } from "./types";

type SpeechSpeedControlProps = {
  value: SpeechRate;
  onChange: (rate: SpeechRate) => void;
  copy: TranslationDictionary["discover"];
  /*
   * Whether the control names itself.
   *
   * It used to sit on the page as a labelled row, which is why it carries its
   * own label. Inside the Signal Controls sheet the section heading already
   * says "Speech speed", so keeping this on printed the words twice, one line
   * apart.
   */
  showLabel?: boolean;
};

const OPTIONS: {
  rate: SpeechRate;
  labelKey: "speedSlow" | "speedNatural" | "speedFast";
  icon: typeof Turtle;
}[] = [
  { rate: 0.75, labelKey: "speedSlow", icon: Turtle },
  { rate: 1, labelKey: "speedNatural", icon: Gauge },
  { rate: 1.25, labelKey: "speedFast", icon: Rabbit },
];

export default function SpeechSpeedControl({
  value,
  onChange,
  copy,
  showLabel = true,
}: SpeechSpeedControlProps) {
  return (
    <div
      className={
        showLabel
          ? "flex items-center justify-between"
          : "flex items-center justify-start"
      }
    >
      {showLabel ? (
        <span
          className="text-[0.75rem] font-medium"
          style={{ color: DISCOVER_COLORS.textSecondary }}
        >
          {copy.speechSpeed}
        </span>
      ) : null}

      {/* Soft "glass" surface — icon-only segments (label + multiplier are
          screen-reader/title text only, not rendered), selected segment
          sits slightly raised (ivory + soft shadow). */}
      <div
        className="flex items-center gap-1 rounded-full p-1"
        style={{
          // Not a literal white: the track has to lift off whatever surface
          // Discover is painted on, and in Cosmic Mode that surface is deep
          // space. See --discover-card in app/globals.css and app/cosmic.css.
          backgroundColor: "color-mix(in oklab, var(--discover-card) 55%, transparent)",
          border: `1px solid ${DISCOVER_COLORS.divider}`,
        }}
      >
        {OPTIONS.map((option) => {
          const active = value === option.rate;
          const Icon = option.icon;
          const label = `${copy[option.labelKey]} · ${option.rate}×`;

          return (
            <button
              key={option.rate}
              type="button"
              onClick={() => onChange(option.rate)}
              aria-label={label}
              aria-pressed={active}
              title={label}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-all"
              style={{
                backgroundColor: active
                  ? DISCOVER_COLORS.selected
                  : "transparent",
                boxShadow: active
                  ? "0 2px 8px rgba(18,18,18,0.08)"
                  : "none",
                color: active
                  ? DISCOVER_COLORS.text
                  : DISCOVER_COLORS.textSecondary,
              }}
            >
              <Icon size={15} strokeWidth={1.8} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
