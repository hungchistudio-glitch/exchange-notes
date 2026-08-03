"use client";

import { useEffect, useRef, useState } from "react";

import MurphMark from "@/components/vocabulary/pet/MurphMark";
import type { MurphMood } from "@/lib/pet/types";

type OnboardingMurphProps = {
  mood?: MurphMood;
  className?: string;
};

// Fallback in case the CSS wake animation never fires onAnimationEnd
// (prefers-reduced-motion, or any other edge case) — mirrors the same
// pattern MurphHomeStage uses, so Murph never gets stuck mid-wake.
const WAKE_FALLBACK_MS = 1900;

// A standalone, backend-free Murph for the onboarding flow: no pet state,
// no vocabulary items, no growth stage — this is a brand-new account, so
// Murph starts at the beginning too (growthStage 0, no crown, no glow).
export default function OnboardingMurph({
  mood = "curious",
  className = "",
}: OnboardingMurphProps) {
  const [isWaking, setIsWaking] = useState(true);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fallbackRef.current = setTimeout(() => setIsWaking(false), WAKE_FALLBACK_MS);
    return () => {
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
    };
  }, []);

  return (
    <div className={className}>
      <MurphMark
        mood={mood}
        isWaking={isWaking}
        isEating={false}
        growthStage={0}
        crownEarned={false}
        onWakeAnimationEnd={() => setIsWaking(false)}
      />
    </div>
  );
}
