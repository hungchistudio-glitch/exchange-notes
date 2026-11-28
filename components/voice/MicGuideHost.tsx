"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import MicGuideSheet from "@/components/voice/MicGuide";
import useCosmicMode from "@/hooks/useCosmicMode";
import { micPermission } from "@/lib/voice/micAccess";
import {
  closeMicGuide,
  micGuideOpen,
  restoreVoiceDeaf,
  setVoiceDeaf,
  subscribeMicGuide,
  voiceStage,
} from "@/lib/voice/signal";

/**
 * The one guide to turning the microphone on, for the whole signed-in app
 * (openMicGuide in lib/voice/signal.ts opens it from anywhere). It also
 * takes Yumi's earmuffs off when the reader comes back from Settings with
 * the microphone allowed, before they have even tried it.
 */
export default function MicGuideHost() {
  const open = useSyncExternalStore(subscribeMicGuide, micGuideOpen, () => false);
  const cosmic = useCosmicMode();
  // Built on the first open and kept, so it can slide away again.
  const [built, setBuilt] = useState(false);
  if (open && !built) setBuilt(true);

  useEffect(() => {
    restoreVoiceDeaf();
    const check = async () => {
      if (!voiceStage.deaf || document.visibilityState !== "visible") return;
      if ((await micPermission()) === "granted") setVoiceDeaf(false);
    };
    void check();
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, []);

  if (!built) return null;
  return <MicGuideSheet open={open} onClose={closeMicGuide} cosmic={cosmic} />;
}
