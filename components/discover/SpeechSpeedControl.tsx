"use client";

import { Gauge, Rabbit, Turtle } from "lucide-react";

import type { TranslationDictionary } from "@/lib/i18n/types";

import { DISCOVER_COLORS, type SpeechRate } from "./types";

type SpeechSpeedControlProps = {
  value: SpeechRate;
  onChange: (rate: SpeechRate) => void;
  copy: TranslationDictionary["discover"];
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
}: SpeechSpeedControlProps) {
  return (
    <div className="flex items-center justify-between">
      <span
        className="text-[12px] font-medium"
        style={{ color: DISCOVER_COLORS.textSecondary }}
      >
        {copy.speechSpeed}
      </span>

      {/* Soft "glass" surface — icon-only segments (label + multiplier are
          screen-reader/title text only, not rendered), selected segment
          sits slightly raised (ivory + soft shadow). */}
      <div
        className="flex items-center gap-1 rounded-full p-1"
        style={{
          backgroundColor: "rgba(255,255,255,0.55)",
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
