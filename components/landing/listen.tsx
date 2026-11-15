"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { LANGUAGE_CODES, getLanguage, type SpeechTag } from "@/lib/languages";
import { SpeakGlyph, SpokenText } from "@/components/speech/Spoken";
import { speechSupported } from "@/lib/speech";
import { playSpoken, stopSpoken } from "@/lib/spokenWords";

/* =========================================================
   Reading aloud on the landing page

   The hero's trial and the sections under it all let a stranger hear a
   word the way the app says it: lib/speech, the device's own voices, the
   reader's saved voice for that language. One speaker per section, so a
   button shows "playing" only while its own text is being read; the text
   lights word by word as it is, as everywhere in the app (Chi,
   2026-11-14), and the button is ▶, ■ while it plays.
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

  useEffect(() => () => stopSpoken(), []);

  const say = useCallback(
    (key: string, text: string, speech: SpeechTag) => {
      setSpeakingKey(key);
      const done = () => setSpeakingKey(current => (current === key ? null : current));
      playSpoken({ run: key, text, lang: speech, rate: RATES[rate], onEnd: done, onError: done, onCancel: done });
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
      onClick={() => (active ? stopSpoken() : speaker.say(id, text, speech))}
    >
      <SpeakGlyph playing={active} size={13} />
      {iconOnly ? null : <span>{active ? playing : play}</span>}
    </button>
  );
}

/** A text a ListenButton reads, lit as it is said; plain where there is no voice for it. */
export function Said({ text, speech }: { text: string; speech: SpeechTag | null }) {
  return speech ? <SpokenText text={text} lang={speech} /> : <>{text}</>;
}
