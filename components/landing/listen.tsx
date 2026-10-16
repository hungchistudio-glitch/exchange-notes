"use client";

import { Volume2 } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { LANGUAGE_CODES, getLanguage, type SpeechTag } from "@/lib/languages";
import { speak, speechSupported, stopSpeech } from "@/lib/speech";

/* =========================================================
   Reading aloud on the landing page

   The hero's trial and the sections under it all let a stranger hear a
   word the way the app says it: lib/speech, the device's own voices, the
   reader's saved voice for that language. One speaker per section, so a
   button shows "playing" only while its own text is being read.
   ========================================================= */

export type Rate = "natural" | "slow";
const RATES: Record<Rate, number> = { natural: 1, slow: 0.6 };

export type Speaker = {
  speakingKey: string | null;
  rate: Rate;
  setRate: (rate: Rate) => void;
  say: (key: string, text: string, speech: SpeechTag) => void;
};

export function useSpeaker(): Speaker {
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const [rate, setRate] = useState<Rate>("natural");

  useEffect(() => () => stopSpeech(), []);

  const say = useCallback(
    (key: string, text: string, speech: SpeechTag) => {
      setSpeakingKey(key);
      const done = () => setSpeakingKey(current => (current === key ? null : current));
      speak(text, speech, { onEnd: done, onError: done }, RATES[rate]);
    },
    [rate],
  );

  return { speakingKey, rate, setRate, say };
}

const noSubscription = () => () => undefined;

/** False on the server and in the hydrating render, true after. */
export function useHydrated() {
  return useSyncExternalStore(noSubscription, () => true, () => false);
}

/** The voice a BCP-47 tag is read in, if the app teaches that language. */
export function speechTagFor(lang: string): SpeechTag | null {
  const primary = lang.toLowerCase().split("-")[0];
  const code = LANGUAGE_CODES.find(item =>
    getLanguage(item).htmlLang.toLowerCase().split("-")[0] === primary,
  );
  return code ? getLanguage(code).speechTag : null;
}

export function ListenButton({
  id,
  text,
  speech,
  speaker,
  play,
  playing,
  label,
  className,
  iconOnly = false,
}: {
  id: string;
  text: string;
  speech: SpeechTag;
  speaker: Speaker;
  play: string;
  playing: string;
  /** Says what will be heard, where the button's own words would not. */
  label?: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const hydrated = useHydrated();
  const active = speaker.speakingKey === id;
  return (
    <button
      type="button"
      className={className}
      data-playing={active || undefined}
      aria-label={label ?? (iconOnly ? play : undefined)}
      title={iconOnly ? (label ?? play) : undefined}
      disabled={hydrated && !speechSupported()}
      onClick={() => speaker.say(id, text, speech)}
    >
      <Volume2 size={15} aria-hidden="true" />
      {iconOnly ? null : <span>{active ? playing : play}</span>}
    </button>
  );
}
