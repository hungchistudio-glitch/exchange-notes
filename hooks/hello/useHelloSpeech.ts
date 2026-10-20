"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { isAppleTouchDevice, preferPlaybackAudio } from "@/lib/hello/audioSession";
import { getLanguage, type LanguageCode } from "@/lib/languages";
import { speak, speechSupported, stopSpeech } from "@/lib/speech";

/* =========================================================
   The hello card's two speakers

   One sound at a time, and only ever the one on screen now (Chi's hello
   brief, §7):

     - tapping the second side stops the first; tapping fast does not
       stack voices;
     - changing a language, swapping the two, going back to the original
       pair, hiding the tab or leaving the page stops whatever is playing;
     - every callback carries the token of the play it belongs to, and one
       from a play that has since been replaced does nothing — so a late
       "ended" cannot clear the new play's state, and nothing old is heard
       in a new language.

   Nothing plays by itself. The voice is the device's own, chosen per
   language by the reader's speech settings (lib/speech.ts), never a voice
   of another language reading this one.

   On an iPhone or iPad, the silent switch mutes it: each tap first asks
   for playback audio (lib/hello/audioSession.ts), and after the first one
   the card says, once, to check the switch.
   ========================================================= */

export type SpeakerPhase = "idle" | "loading" | "playing" | "error";

export type HelloSpeech = {
  supported: boolean;
  /** An iPhone or iPad has been tapped: say to check its silent switch. */
  silentHint: boolean;
  phaseFor: (side: 0 | 1) => SpeakerPhase;
  play: (side: 0 | 1, text: string, language: LanguageCode) => void;
  stop: () => void;
};

const noSubscription = () => () => {};

/**
 * The card calls `stop` whenever what is on screen becomes a different
 * sound — a language changed, the pair swapped or restored — so a sound
 * from before the change is never heard after it.
 */
export default function useHelloSpeech(): HelloSpeech {
  const [state, setState] = useState<{ side: 0 | 1; phase: SpeakerPhase } | null>(null);
  const token = useRef(0);
  /* The voice exists only in the browser: false on the server and on the
     first render, so the two agree. */
  const supported = useSyncExternalStore(noSubscription, speechSupported, () => false);
  const appleTouch = useSyncExternalStore(noSubscription, isAppleTouchDevice, () => false);
  const [silentHint, setSilentHint] = useState(false);

  const stop = useCallback(() => {
    token.current += 1;
    stopSpeech();
    setState(null);
  }, []);

  const play = useCallback((side: 0 | 1, text: string, language: LanguageCode) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    token.current += 1;
    const mine = token.current;
    const own = (phase: SpeakerPhase | null) => {
      if (token.current !== mine) return;
      setState(phase ? { side, phase } : null);
    };
    setState({ side, phase: "loading" });
    if (appleTouch) {
      /* In the tap itself, before speaking: see lib/hello/audioSession.ts. */
      preferPlaybackAudio();
      setSilentHint(true);
    }
    speak(trimmed, getLanguage(language).speechTag, {
      onStart: () => own("playing"),
      onEnd: () => own(null),
      onError: () => own("error"),
    });
  }, [appleTouch]);

  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", stop);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", stop);
      stop();
    };
  }, [stop]);

  const phaseFor = useCallback(
    (side: 0 | 1): SpeakerPhase => (state?.side === side ? state.phase : "idle"),
    [state],
  );

  return { supported, silentHint, phaseFor, play, stop };
}
