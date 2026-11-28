"use client";

import { useEffect, useState } from "react";

import StandardHomeReview from "@/components/home/StandardHomeReview";
import { setVoiceDeaf, voiceSignal, voiceStage } from "@/lib/voice/signal";

type Mode = "calm" | "deaf" | "listen";

/**
 * The home's Yumi, told by hand that the microphone is refused (earmuffs)
 * or listening (her pupil opening with a voice that rises and falls, her
 * eye on the corner a key would be in). /yumi-listens-review.
 */
export default function YumiListensReview() {
  const [mode, setMode] = useState<Mode>("calm");

  useEffect(() => {
    setVoiceDeaf(mode === "deaf");
    if (mode !== "listen") {
      voiceStage.phase = "idle";
      voiceSignal.level = 0;
      return;
    }
    voiceStage.phase = "listening";
    voiceStage.mic = { x: window.innerWidth - 40, y: window.innerHeight - 60 };
    const timer = setInterval(() => {
      voiceSignal.level = 0.5 + 0.5 * Math.sin(performance.now() / 180);
    }, 30);
    return () => {
      clearInterval(timer);
      voiceStage.phase = "idle";
      voiceSignal.level = 0;
    };
  }, [mode]);

  useEffect(() => () => setVoiceDeaf(false), []);

  return (
    <>
      <div role="group" aria-label="Yumi" className="fixed right-2 top-2 z-[99999] flex gap-1.5">
        {(["calm", "deaf", "listen"] as const).map(option => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => setMode(option)}
            className={`rounded-lg border border-black px-3 py-1 text-sm ${mode === option ? "bg-black text-white" : "bg-white text-black"}`}
          >
            {option}
          </button>
        ))}
      </div>
      <StandardHomeReview frame />
    </>
  );
}
