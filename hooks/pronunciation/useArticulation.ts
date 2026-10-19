"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import usePhonetics from "@/hooks/usePhonetics";
import {
  buildTimeline,
  scaleTimeline,
  utteranceFromBeats,
  type ArticulationTimeline,
} from "@/lib/pronunciation/articulationTimeline";
import { speechRateFor } from "@/lib/pronunciation/lab/audio";
import {
  intonationOf,
  parseTranscription,
  singlePhone,
  type Utterance,
} from "@/lib/pronunciation/phones";
import {
  expectedDuration,
  getServerSpeaking,
  getSpeaking,
  noteEstimate,
  subscribeToSpeaking,
  type Speaking,
} from "@/lib/pronunciation/speaking";

/* =========================================================
   Yumi's clock

   Follows whatever the Lab is playing (lib/pronunciation/speaking.ts),
   turns it into a timeline of moments, and says which moment is happening
   now. Moment by moment rather than frame by frame: a word is ten or
   twenty moments, so the screen re-renders that many times, not sixty a
   second, and the playhead between them is a CSS animation.

   The transcription comes with the sound when the screen has it; when it
   does not, it is asked for the way every word card asks
   (hooks/usePhonetics.ts), and the animation joins the audio wherever it
   has got to by the time it arrives.
   ========================================================= */

export type Articulation = {
  /** The last thing said, as a timeline in real milliseconds. */
  timeline: ArticulationTimeline | null;
  /** Its id, which changes with every playback. */
  id: number | null;
  /** Still sounding. */
  playing: boolean;
  /** The moment happening now, while playing. */
  step: number | null;
  /** How far into the audio the animation joined it — 0 unless its
   *  transcription arrived late. */
  offset: number;
  /** The phones a sound card is about. */
  focus: ReadonlySet<number>;
};

const strip = (symbol: string) => symbol.replace(/[ːˑ̩̯]/g, "");

function soundsFor(speaking: Speaking, fetched: string | undefined): Utterance | null {
  const hint = speaking.hint;
  if (hint?.beats?.length) return utteranceFromBeats(hint.beats);
  const written = hint?.phonetic ?? fetched;
  const parsed = parseTranscription(written, speaking.language);
  if (parsed) return parsed;
  if (hint?.features) return singlePhone(hint.features, hint.symbol ?? speaking.text);
  return null;
}

/** The sounds, and how the sentence they are in ends. */
function utteranceFor(speaking: Speaking, fetched: string | undefined): Utterance | null {
  const sounds = soundsFor(speaking, fetched);
  return sounds ? { ...sounds, intonation: intonationOf(speaking.text, speaking.language) } : null;
}

export default function useArticulation(): Articulation {
  const speaking = useSyncExternalStore(subscribeToSpeaking, getSpeaking, getServerSpeaking);

  /* Only what was said on this screen: a word from the last screen is not
     this one's to show. */
  const [mountedAt] = useState(() => (typeof performance !== "undefined" ? performance.now() : 0));
  const own = speaking && speaking.startedAt >= mountedAt ? speaking : null;

  const needsLookup = Boolean(own && !own.hint?.phonetic && !own.hint?.beats?.length);
  const lookupText = needsLookup ? own?.text : undefined;
  const lookupLanguage = own?.language;
  const requests = useMemo(
    () => (lookupText && lookupLanguage ? [{ text: lookupText, language: lookupLanguage }] : []),
    [lookupLanguage, lookupText],
  );
  const phonetics = usePhonetics(requests);
  const known = own && needsLookup ? phonetics({ text: own.text, language: own.language }) : undefined;
  const fetched = own?.language === "zh-TW" ? known?.zhuyin : known?.ipa;
  /* Asked and not back yet: wait for it rather than fall back early. */
  const waiting = needsLookup && known === undefined && !own?.hint?.features;

  const timeline = useMemo(() => {
    if (!own || waiting) return null;
    const utterance = utteranceFor(own, fetched);
    if (!utterance) return null;
    const raw = buildTimeline(utterance);
    const expected = expectedDuration(own, raw.duration, speechRateFor(own.speed));
    return { raw, scaled: scaleTimeline(raw, expected) };
  }, [fetched, own, waiting]);

  /* What the animation assumed, so the real length can correct the next. */
  useEffect(() => {
    if (own && timeline) noteEstimate(own, timeline.raw.duration);
  }, [own, timeline]);

  const focus = useMemo(() => {
    const symbols = new Set((own?.hint?.focus ?? []).map(strip));
    const found = new Set<number>();
    if (!timeline || !symbols.size) return found;
    timeline.scaled.utterance.phones.forEach((phone, index) => {
      if (symbols.has(strip(phone.symbol))) found.add(index);
    });
    return found;
  }, [own, timeline]);

  const [step, setStep] = useState<{ id: number; index: number | null; offset: number } | null>(null);

  const id = own?.id ?? null;
  const startedAt = own?.startedAt ?? null;
  const ended = own?.endedAt !== undefined;
  const scaled = timeline?.scaled ?? null;

  useEffect(() => {
    if (id === null || startedAt === null || !scaled || ended) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const offset = Math.max(0, performance.now() - startedAt);

    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const index = scaled.steps.findIndex(
        (candidate) => elapsed < candidate.start + candidate.duration,
      );
      if (index < 0) {
        setStep({ id, index: null, offset });
        return;
      }
      setStep({ id, index, offset });
      const current = scaled.steps[index];
      const wait = Math.max(8, current.start + current.duration - elapsed);
      timer = setTimeout(tick, wait);
    };

    tick();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [ended, id, scaled, startedAt]);

  const playing = Boolean(own && !ended);
  const current = playing && step?.id === id ? step.index : null;

  return {
    timeline: scaled,
    id,
    playing,
    step: current,
    offset: step?.id === id ? step.offset : 0,
    focus,
  };
}
