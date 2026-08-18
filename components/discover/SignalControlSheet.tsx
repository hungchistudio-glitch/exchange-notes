"use client";

import { X } from "lucide-react";

import { track } from "@/lib/analytics/track";
import type { TranslationDictionary } from "@/lib/i18n/types";

import SpeechSpeedControl from "./SpeechSpeedControl";
import { DISCOVER_COLORS, categoryAccent, type SpeechRate } from "./types";

type SignalControlSheetProps = {
  open: boolean;
  onClose: () => void;
  copy: TranslationDictionary["discover"];

  speechRate: SpeechRate;
  onSpeechRateChange: (rate: SpeechRate) => void;

  /** Every category present in the current feed, in the order they appear. */
  topics: string[];
  /** Empty means everything — the absence of a filter, not a filter of none. */
  selectedTopics: Set<string>;
  onToggleTopic: (topic: string) => void;
  onClearTopics: () => void;
};

/**
 * What a long press on the Signal Radar opens.
 *
 * The brief lists six kinds of control this surface could carry: topic,
 * difficulty, source, speech speed, learning density and region. Two of them
 * exist. Speech speed is a real preference the page already honours, and topic
 * is a real filter over a field every card already carries — the rest would
 * need ranking, source metadata or a difficulty model that Discover does not
 * have, and a sheet full of switches wired to nothing is worse than a shorter
 * sheet that works.
 *
 * So this ships the two that are real and has room for the others. It is
 * reachable by long press and by an ordinary control in the header, because a
 * gesture cannot be the only way to reach a setting.
 */
export default function SignalControlSheet({
  open,
  onClose,
  copy,
  speechRate,
  onSpeechRateChange,
  topics,
  selectedTopics,
  onToggleTopic,
  onClearTopics,
}: SignalControlSheetProps) {
  if (!open) return null;

  const allSelected = selectedTopics.size === 0;

  return (
    <div className="fixed inset-0 z-[300] flex items-end">
      <button
        type="button"
        onClick={onClose}
        aria-label={copy.signalControlsClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.signalControlsTitle}
        className="relative w-full rounded-t-[28px] px-5 pb-8 pt-5"
        style={{
          backgroundColor: DISCOVER_COLORS.card,
          borderTop: `1px solid ${DISCOVER_COLORS.divider}`,
          paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)",
        }}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p
              className="hud-label text-[11px] font-semibold uppercase tracking-[0.15em]"
              style={{ color: DISCOVER_COLORS.accent }}
            >
              {copy.signalControlsEyebrow}
            </p>
            <h2
              className="mt-1 text-[22px] font-bold tracking-[-0.02em]"
              style={{ color: DISCOVER_COLORS.text }}
            >
              {copy.signalControlsTitle}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={copy.signalControlsClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              border: `1px solid ${DISCOVER_COLORS.divider}`,
              color: DISCOVER_COLORS.textSecondary,
            }}
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        <p
          className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: DISCOVER_COLORS.textSecondary }}
        >
          {copy.signalControlsSpeed}
        </p>

        <SpeechSpeedControl
          value={speechRate}
          onChange={(rate) => {
            track("radar.control_changed", { control: "speech_rate", value: rate });
            onSpeechRateChange(rate);
          }}
          copy={copy}
        />

        {topics.length > 1 ? (
          <>
            <p
              className="mb-2 mt-6 text-[12px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: DISCOVER_COLORS.textSecondary }}
            >
              {copy.signalControlsTopics}
            </p>

            <div className="flex flex-wrap gap-2">
              {/*
                "All" is the absence of a filter rather than a seventh topic,
                which is why it clears the set instead of joining it — a feed
                filtered to nothing is a bug the user can walk into otherwise.
              */}
              <button
                type="button"
                onClick={() => {
                  track("radar.control_changed", { control: "topics", value: "all" });
                  onClearTopics();
                }}
                aria-pressed={allSelected}
                className="h-9 rounded-full px-4 text-[13px] font-medium transition"
                style={{
                  border: `1px solid ${
                    allSelected ? DISCOVER_COLORS.accent : DISCOVER_COLORS.divider
                  }`,
                  color: allSelected
                    ? DISCOVER_COLORS.onAccent
                    : DISCOVER_COLORS.textSecondary,
                  backgroundColor: allSelected
                    ? DISCOVER_COLORS.accent
                    : "transparent",
                }}
              >
                {copy.signalControlsAllTopics}
              </button>

              {topics.map((topic) => {
                const selected = selectedTopics.has(topic);
                const accent = categoryAccent(topic);

                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => {
                      track("radar.control_changed", { control: "topics", value: topic });
                      onToggleTopic(topic);
                    }}
                    aria-pressed={selected}
                    className="h-9 rounded-full px-4 text-[13px] font-medium uppercase tracking-[0.04em] transition"
                    style={{
                      border: `1px solid ${selected ? accent : DISCOVER_COLORS.divider}`,
                      color: selected ? DISCOVER_COLORS.onAccent : accent,
                      backgroundColor: selected ? accent : "transparent",
                    }}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
