import type { LanguageCode } from "@/lib/languages";

import type { SyllableBeat } from "./lab/types";
import type { PhoneticFeatures } from "./yumiRig";

/* =========================================================
   What Yumi is saying, right now

   The Lab plays sounds from a dozen places — a sound card, a word row, a
   minimal pair, a rhythm phrase, the trainer's "hear it" — through one
   playback hook. Yumi is drawn somewhere else on the screen. Threading
   "what is playing, since when" from every button to her through every
   module would be a prop in a dozen components whose only reason to carry
   it is her.

   So the playback hook announces it here, the way homeMoments.ts carries
   the home screen's events: a module-level store, one utterance at a
   time, and Yumi reads it. Nothing here knows Yumi exists.

   Also the clock's correction. The browser's voice gives no timing for
   the sounds inside a word, so the animation's timeline is an estimate;
   but how long the whole thing took is known the moment it ends. That is
   kept, per text, and per language as a running ratio of real to
   estimated, so the second hearing of a word is in time with it and the
   first hearing of the next word is closer than the first was.
   ========================================================= */

/** What the speaker knows about how the text is said. */
export type ArticulationHint = {
  /** IPA ("/ˈka.sa/") or zhuyin ("ㄇㄚ") for exactly the text spoken. */
  phonetic?: string;
  /** The sound a sound card is about, as IPA symbols, to highlight. */
  focus?: readonly string[];
  /** The sound card's own features, for when there is no transcription. */
  features?: PhoneticFeatures;
  symbol?: string;
  /** A rhythm phrase's syllables. */
  beats?: readonly SyllableBeat[];
};

export type Speaking = {
  id: number;
  text: string;
  language: LanguageCode;
  speed: "native" | "slow";
  hint?: ArticulationHint;
  /** performance.now() when the audio started. */
  startedAt: number;
  /** performance.now() when it ended; absent while it is still playing. */
  endedAt?: number;
};

let current: Speaking | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of [...listeners]) listener();
}

export function subscribeToSpeaking(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSpeaking(): Speaking | null {
  return current;
}

export function getServerSpeaking(): Speaking | null {
  return null;
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** The audio for `text` has started. Returns its id, for ending it. */
export function announceSpeaking(
  speaking: Omit<Speaking, "id" | "startedAt" | "endedAt"> & { startedAt?: number },
): number {
  const id = nextId;
  nextId += 1;
  current = { ...speaking, id, startedAt: speaking.startedAt ?? now() };
  notify();
  return id;
}

/** The audio `id` has finished — or was cut off, which `cut` says. */
export function announceSpeakingEnd(id: number, options: { at?: number; cut?: boolean } = {}): void {
  if (!current || current.id !== id || current.endedAt !== undefined) return;
  const endedAt = options.at ?? now();
  /* A cut-off playback says nothing about how long the text takes. */
  if (!options.cut) recordDuration(current, endedAt - current.startedAt);
  current = { ...current, endedAt };
  notify();
}

/* ── Calibration ───────────────────────────────────────────────────── */

const measured = new Map<string, number>();
const ratios = new Map<string, number[]>();
const RATIO_MEMORY = 8;
/** Below this a playback is a failure or a cut, not a measurement. */
const MIN_MEASURE_MS = 120;

function textKey(speaking: Pick<Speaking, "language" | "speed" | "text">) {
  return `${speaking.language}|${speaking.speed}|${speaking.text.trim().toLocaleLowerCase()}`;
}

function rateKey(speaking: Pick<Speaking, "language" | "speed">) {
  return `${speaking.language}|${speaking.speed}`;
}

/* The estimate the last animation of each text was built on, so the real
   length can be turned into a ratio when the audio ends. */
const estimates = new Map<string, number>();

/** The animation for `speaking` assumed the text takes `estimatedMs`. */
export function noteEstimate(speaking: Pick<Speaking, "language" | "speed" | "text">, estimatedMs: number): void {
  if (estimatedMs > 0) estimates.set(textKey(speaking), estimatedMs);
}

function recordDuration(speaking: Speaking, actualMs: number) {
  if (!(actualMs >= MIN_MEASURE_MS)) return;
  const key = textKey(speaking);
  measured.set(key, actualMs);

  const estimate = estimates.get(key);
  if (!estimate) return;
  const list = ratios.get(rateKey(speaking)) ?? [];
  list.push(actualMs / estimate);
  if (list.length > RATIO_MEMORY) list.shift();
  ratios.set(rateKey(speaking), list);
}

function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * How long `speaking` will take, best known: exactly, if this text has been
 * heard at this speed before; else the estimate corrected by how this
 * voice has run against estimates so far; else the estimate at `rate`.
 */
export function expectedDuration(
  speaking: Pick<Speaking, "language" | "speed" | "text">,
  estimatedMs: number,
  rate: number,
): number {
  const exact = measured.get(textKey(speaking));
  if (exact) return exact;
  const ratio = median(ratios.get(rateKey(speaking)) ?? []);
  if (ratio) return estimatedMs * ratio;
  return estimatedMs / Math.max(0.2, rate);
}

/** For tests. */
export function resetSpeakingForTests(): void {
  current = null;
  measured.clear();
  ratios.clear();
  estimates.clear();
  notify();
}
