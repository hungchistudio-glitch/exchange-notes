"use client";

import type { ReactNode } from "react";

export type SegmentedOption<Value extends string> = {
  value: Value;
  // What fits inside the segment. Often shorter than the name a screen
  // reader should announce, which is what `label` is for.
  content: ReactNode;
  label: string;
};

type SegmentedControlProps<Value extends string> = {
  options: Array<SegmentedOption<Value>>;
  value: Value;
  onChange: (value: Value) => void;
  // Names the group itself ("Interface mode"), so the announcement is
  // "Interface mode, Standard, selected" rather than a bare "Standard".
  groupLabel: string;
  // Stretches the segments to share the full width. For a control that sits
  // under its label rather than beside it.
  fill?: boolean;
  className?: string;
};

/**
 * Two or three mutually exclusive values, chosen in place.
 *
 * Settings uses this wherever a detail screen would only have shown the same
 * options again — interface mode and font size — so the choice costs one tap
 * instead of three. Selection is drawn as an inversion rather than a colour,
 * which keeps it correct in both interface modes and readable without relying
 * on hue alone.
 */
export default function SegmentedControl<Value extends string>({
  options,
  value,
  onChange,
  groupLabel,
  fill = false,
  className = "",
}: SegmentedControlProps<Value>) {
  return (
    <div
      role="radiogroup"
      aria-label={groupLabel}
      className={[
        "flex items-center gap-0.5 rounded-full bg-black/[0.05] p-[3px]",
        fill ? "w-full" : "w-fit shrink-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            onClick={() => {
              if (!selected) onChange(option.value);
            }}
            className={[
              "flex min-h-[34px] items-center justify-center rounded-full px-3.5",
              fill ? "flex-1" : "",
              "text-[13px] font-semibold tracking-[-0.01em]",
              "transition-[background-color,color] duration-200 ease-out",
              selected
                ? "bg-black text-white"
                : "text-ink-soft hover:text-black",
            ].join(" ")}
          >
            {option.content}
          </button>
        );
      })}
    </div>
  );
}
