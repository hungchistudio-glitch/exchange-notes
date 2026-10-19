import { getLanguage, type LanguageCode } from "@/lib/languages";
import { getSpeechSettings, speak, speechSupported } from "@/lib/speech";

import { isZhuyin, parseTranscription, parseZhuyin } from "../phones";
import type { ArticulationHint } from "../speaking";
import type {
  MinimalPairExample,
  PronunciationExample,
  PronunciationUnit,
  RhythmPhrase,
} from "./types";

/* =========================================================
   Where a sound comes from

   Three answers, resolved in one place instead of at each button: a real
   recording if the pack has one, the browser's voice if it does not, and
   nothing at all if the device has neither. The third is a real case — a
   locked-down browser with no speech synthesis — and it has to reach the UI
   as "no audio available" rather than as a button that does nothing.
   ========================================================= */

/*
 * A sound that can be played carries what is known about how it is said —
 * its transcription, and on a sound card the sound it is about — so Yumi
 * can show it as it plays (lib/pronunciation/speaking.ts).
 */
export type AudioSource =
  | { kind: "recorded"; src: string; language: LanguageCode; text: string; hint?: ArticulationHint }
  | { kind: "speech"; text: string; language: LanguageCode; hint?: ArticulationHint }
  | { kind: "unavailable" };

/** Playback speed. "slow" is for hearing where one sound ends and the next starts. */
export type PlaybackSpeed = "native" | "slow";

const SLOW_RATE_MULTIPLIER = 0.6;
/** Below this, most voices stop sounding like speech and start sounding broken. */
const MIN_SPEECH_RATE = 0.35;

function fromText(
  text: string | undefined,
  language: LanguageCode,
  audio?: string,
  hint?: ArticulationHint,
): AudioSource {
  const trimmed = text?.trim();

  if (audio) {
    return { kind: "recorded", src: audio, language, text: trimmed ?? "", hint };
  }
  if (trimmed && speechSupported()) {
    return { kind: "speech", text: trimmed, language, hint };
  }
  return { kind: "unavailable" };
}

const fold = (text: string) => text.normalize("NFC").trim().toLocaleLowerCase();

/** The IPA symbols of a sound card's sound: "/e/ · /ɛ/" is e and ɛ. */
function focusSymbols(unit: PronunciationUnit): string[] {
  if (unit.language === "zh-TW") {
    return isZhuyin(unit.symbol) ? parseZhuyin(unit.symbol).phones.map((phone) => phone.symbol) : [];
  }
  const written = unit.phoneticRepresentation ?? "";
  return written
    .split("·")
    .flatMap((part) => parseTranscription(part, unit.language)?.phones ?? [])
    .map((phone) => phone.symbol);
}

/**
 * What a sound card's audio is known to say.
 *
 * A card plays a word with its sound in it — /iː/ is "see", tone one is
 * 媽 — so the transcription is the example's that matches the word, and the
 * card's own sound is marked as the focus. A card that speaks its own
 * symbol uses its own transcription.
 */
function unitHint(unit: PronunciationUnit): ArticulationHint {
  const spoken = fold(unit.speechText ?? unit.symbol);
  const example = unit.examples.find((candidate) => fold(candidate.text) === spoken);
  const own =
    !unit.speechText && unit.phoneticRepresentation && !unit.phoneticRepresentation.includes("·")
      ? unit.phoneticRepresentation
      : undefined;
  return {
    phonetic: example?.phonetic ?? own,
    focus: focusSymbols(unit),
    features: unit.features,
    symbol: unit.symbol,
  };
}

export function unitAudio(unit: PronunciationUnit): AudioSource {
  return fromText(unit.speechText ?? unit.symbol, unit.language, unit.audio, unitHint(unit));
}

export function exampleAudio(
  example: PronunciationExample | MinimalPairExample,
  language: LanguageCode,
): AudioSource {
  return fromText(example.text, language, example.audio, { phonetic: example.phonetic });
}

export function phraseAudio(
  phrase: RhythmPhrase,
  language: LanguageCode,
): AudioSource {
  return fromText(phrase.speechText ?? phrase.text, language, phrase.audio, { beats: phrase.beats });
}

/* =========================================================
   Playing it
   ========================================================= */

export type PlaybackHandle = {
  /** Stops this playback. Safe to call more than once. */
  stop: () => void;
};

export type PlayOptions = {
  speed?: PlaybackSpeed;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
};

let currentAudioElement: HTMLAudioElement | null = null;

/**
 * Stops whatever is sounding, from either source.
 *
 * One function for both because the two can never overlap by design: a
 * screen plays one thing at a time, and the second tap on a speaker should
 * replace the first rather than layer on top of it.
 */
export function stopPronunciationAudio() {
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.currentTime = 0;
    currentAudioElement = null;
  }

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

/** The voice's rate for `speed` — what the animation's clock divides by. */
export function speechRateFor(speed: PlaybackSpeed): number {
  const base = getSpeechSettings().rate;
  if (speed === "native") return base;
  return Math.max(MIN_SPEECH_RATE, base * SLOW_RATE_MULTIPLIER);
}

/**
 * Plays a source, and hands back the way to stop it.
 *
 * The handle matters more than it looks: a card can scroll away, a route
 * can change, and a user can tap a second sound before the first finishes.
 * All three are the same operation, and all three have to be able to reach
 * a playback they did not start.
 */
export function playPronunciation(
  source: AudioSource,
  options: PlayOptions = {},
): PlaybackHandle {
  const { speed = "native", onStart, onEnd, onError } = options;

  stopPronunciationAudio();

  if (source.kind === "unavailable") {
    onError?.();
    return { stop: () => {} };
  }

  let cancelled = false;

  const stop = () => {
    cancelled = true;
    stopPronunciationAudio();
  };

  if (source.kind === "speech") {
    speak(
      source.text,
      getLanguage(source.language).speechTag,
      {
        onStart: () => {
          if (!cancelled) onStart?.();
        },
        onEnd: () => {
          if (!cancelled) onEnd?.();
        },
        onError: () => {
          if (!cancelled) onError?.();
        },
      },
      speechRateFor(speed),
    );

    return { stop };
  }

  const element = new Audio(source.src);
  element.playbackRate = speed === "slow" ? SLOW_RATE_MULTIPLIER : 1;
  currentAudioElement = element;

  let handled = false;

  /**
   * A missing or unplayable recording falls through to the voice rather
   * than failing. The pack lists audio files that may not have shipped
   * yet, and hearing the word in a synthesised voice is a better answer
   * than hearing nothing.
   */
  const fallBackToSpeech = () => {
    if (handled || cancelled) return;
    handled = true;
    currentAudioElement = null;

    if (!source.text || !speechSupported()) {
      onError?.();
      return;
    }

    speak(
      source.text,
      getLanguage(source.language).speechTag,
      {
        onStart: () => {
          if (!cancelled) onStart?.();
        },
        onEnd: () => {
          if (!cancelled) onEnd?.();
        },
        onError: () => {
          if (!cancelled) onError?.();
        },
      },
      speechRateFor(speed),
    );
  };

  element.addEventListener(
    "playing",
    () => {
      if (!cancelled) onStart?.();
    },
    { once: true },
  );

  element.addEventListener(
    "ended",
    () => {
      handled = true;
      currentAudioElement = null;
      if (!cancelled) onEnd?.();
    },
    { once: true },
  );

  element.addEventListener("error", fallBackToSpeech, { once: true });

  void element.play().catch(fallBackToSpeech);

  return { stop };
}

/**
 * Plays two sources one after the other, with a gap.
 *
 * This is the A/B compare in Speak, and the "sound, pause, sound again"
 * demonstration on a sound card. Returns a handle that cancels the rest of
 * the sequence, not just whatever is sounding right now.
 */
export function playSequence(
  steps: Array<{ source: AudioSource; speed?: PlaybackSpeed; gapMs?: number }>,
  options: {
    onStep?: (index: number) => void;
    /** A step's audio has actually started sounding. */
    onStepStart?: (index: number) => void;
    /** A step's audio has finished (before its gap). */
    onStepEnd?: (index: number) => void;
    onEnd?: () => void;
    onError?: () => void;
  } = {},
): PlaybackHandle {
  let cancelled = false;
  let currentHandle: PlaybackHandle | null = null;
  let gapTimer: ReturnType<typeof setTimeout> | null = null;

  function runStep(index: number) {
    if (cancelled) return;

    if (index >= steps.length) {
      options.onEnd?.();
      return;
    }

    const step = steps[index];
    options.onStep?.(index);

    currentHandle = playPronunciation(step.source, {
      speed: step.speed,
      onStart: () => {
        if (!cancelled) options.onStepStart?.(index);
      },
      onEnd: () => {
        if (cancelled) return;
        options.onStepEnd?.(index);
        const gap = step.gapMs ?? 0;
        if (gap > 0) {
          gapTimer = setTimeout(() => runStep(index + 1), gap);
        } else {
          runStep(index + 1);
        }
      },
      onError: () => {
        if (cancelled) return;
        options.onError?.();
        runStep(index + 1);
      },
    });
  }

  runStep(0);

  return {
    stop: () => {
      cancelled = true;
      if (gapTimer) clearTimeout(gapTimer);
      currentHandle?.stop();
    },
  };
}
