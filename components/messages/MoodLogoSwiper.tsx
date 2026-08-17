"use client";

import { useRef, useState } from "react";

import ExchangeNotesMark from "@/components/ui/ExchangeNotesMark";
import useTranslation from "@/hooks/i18n/useTranslation";

import styles from "./MoodLogoSwiper.module.css";

// Derived from the same breathing ExchangeNotesMark used on the splash
// screen / loader (components/ui/ExchangeNotesMark.tsx) — same SVG, same
// eye, just five different animation timelines on its pupil/eyelids.
// Swipe (native scroll-snap, no hand-rolled touch handling) to cycle
// through them, inspired by the reference video's swipe-to-change-icon
// wordmark pattern.
const MOODS = [
  {
    id: "calm",
    labelKey: "moodCalm",
    shell: styles.shellCalm,
    pupil: undefined,
    upperLid: styles.upperLidCalm,
    lowerLid: styles.lowerLidCalm,
  },
  {
    id: "curious",
    labelKey: "moodCurious",
    shell: styles.shellCurious,
    pupil: styles.pupilCurious,
    upperLid: styles.upperLidCurious,
    lowerLid: styles.lowerLidCurious,
  },
  {
    id: "sleepy",
    labelKey: "moodSleepy",
    shell: styles.shellSleepy,
    pupil: styles.pupilSleepy,
    upperLid: styles.upperLidSleepy,
    lowerLid: styles.lowerLidSleepy,
  },
  {
    id: "surprised",
    labelKey: "moodSurprised",
    shell: styles.shellSurprised,
    pupil: styles.pupilSurprised,
    upperLid: styles.upperLidSurprised,
    lowerLid: styles.lowerLidSurprised,
  },
  {
    id: "happy",
    labelKey: "moodHappy",
    shell: styles.shellHappy,
    pupil: undefined,
    upperLid: styles.upperLidHappy,
    lowerLid: styles.lowerLidHappy,
  },
] as const;

type MoodLabelKey = (typeof MOODS)[number]["labelKey"];

export default function MoodLogoSwiper() {
  const { t } = useTranslation();
  const copy = t.messages;

  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;

    const slideWidth = track.clientWidth;
    if (slideWidth === 0) return;

    const index = Math.round(track.scrollLeft / slideWidth);
    setActiveIndex(Math.min(Math.max(index, 0), MOODS.length - 1));
  }

  const activeLabelKey: MoodLabelKey = MOODS[activeIndex].labelKey;

  return (
    <div className="mt-1">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        aria-label={copy[activeLabelKey]}
        className={`flex overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${styles.track}`}
      >
        {MOODS.map((mood) => (
          <div
            key={mood.id}
            className={`flex w-full shrink-0 items-center justify-center py-3 ${styles.slide}`}
          >
            <div className={`${styles.logoShell} ${mood.shell}`}>
              <ExchangeNotesMark
                className={styles.logo}
                pupilClassName={mood.pupil}
                upperLidClassName={mood.upperLid}
                lowerLidClassName={mood.lowerLid}
                surfaceColor="var(--msg-surface-soft)"
                highlightColor="var(--msg-surface)"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-1.5 flex items-center justify-center gap-1.5">
        {MOODS.map((mood, index) => (
          <span
            key={mood.id}
            className={`h-1.5 rounded-full transition-all ${
              index === activeIndex
                ? "w-4 bg-black/70"
                : "w-1.5 bg-black/15"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
