"use client";

import { useEffect, useRef, useState } from "react";

import YumiMark from "@/components/vocabulary/pet/YumiMark";
import type { YumiMood } from "@/lib/pet/types";

type OnboardingYumiProps = {
  mood?: YumiMood;
  className?: string;
};

// Fallback in case the CSS wake animation never fires onAnimationEnd
// (prefers-reduced-motion, or any other edge case) — mirrors the same
// pattern YumiHomeStage uses, so Yumi never gets stuck mid-wake.
const WAKE_FALLBACK_MS = 1900;

// A standalone, backend-free Yumi for the onboarding flow: no pet state,
// no vocabulary items, no growth stage — this is a brand-new account, so
// Yumi starts at the beginning too (growthStage 0, no crown, no glow).
export default function OnboardingYumi({
  mood = "curious",
  className = "",
}: OnboardingYumiProps) {
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
      <YumiMark
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
