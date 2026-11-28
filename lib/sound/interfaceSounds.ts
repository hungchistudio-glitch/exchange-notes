/* =========================================================
   The interface's sounds (Chi, 2026-11-14: 更科幻風格, 介面音效)

   A handful, synthesised with Web Audio so there is nothing to download, and
   all of them quiet and short, as a ship's console is:

   - tap: a short tick for a button, a link, a tab.
   - warp: a rising sweep of filtered noise, as a Cosmic page jumps in
     (lib/motion/warpArrival.ts).
   - page: a softer, lower swish for a Standard page.
   - reward: two notes up, when cookies land (ENERGY_LANDED_EVENT).
   - scan and lock: the hum of Yumi's iris scan on the way into sign-in,
     and its click as it locks (components/landing/loginTransition.ts).

   On by default in Yumi Cosmic, off in Standard (Chi chose), and either
   can be switched in Settings, for this device. The games keep their own
   sounds and switch (lib/hangyumi/sounds.ts), so nothing here plays on
   their screens.

   The audio context is made inside a tap, the only place iOS lets it
   start, and the session is ambient: it mixes with music and keeps to
   the iPhone's silent switch.
   ========================================================= */

import type { InterfaceMode } from "@/lib/appPreferences";
import { preferAudioSession } from "@/lib/audio/session";

export const INTERFACE_SOUNDS_KEY = "interface-sounds";
/** Fired when the switch moves, so every reader of it hears at once. */
export const INTERFACE_SOUNDS_EVENT = "interface-sounds-change";

/** The screens that play their own sounds. */
const OWN_SOUNDS = /^\/(hangyumi|wordvault|starweaver)(\/|$)/;

export function interfaceSoundsChoice(): "on" | "off" | null {
  try {
    const stored = window.localStorage.getItem(INTERFACE_SOUNDS_KEY);
    return stored === "on" || stored === "off" ? stored : null;
  } catch {
    return null;
  }
}

/** On unless switched off; with no choice made, on only in Cosmic. */
export function interfaceSoundsOn(mode: InterfaceMode | string | undefined): boolean {
  const choice = interfaceSoundsChoice();
  if (choice) return choice === "on";
  return mode === "yumi-cosmic";
}

export function setInterfaceSounds(on: boolean) {
  try {
    window.localStorage.setItem(INTERFACE_SOUNDS_KEY, on ? "on" : "off");
  } catch {
    // Private mode: the choice lasts the page.
  }
  window.dispatchEvent(new Event(INTERFACE_SOUNDS_EVENT));
}

function currentMode() {
  return typeof document === "undefined" ? undefined : document.documentElement.dataset.interfaceMode;
}

function allowedHere() {
  return typeof window !== "undefined"
    && !OWN_SOUNDS.test(window.location.pathname)
    && interfaceSoundsOn(currentMode());
}

let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;

/** Call inside a tap: makes or wakes the context. Off, it touches no audio. */
export function unlockInterfaceSounds() {
  if (!allowedHere()) return;
  // Ambient keeps to the silent switch; never while a microphone is open,
  // where it would leave no input (lib/audio/session.ts).
  preferAudioSession("ambient");
  const Constructor = window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Constructor) return;
  try {
    context ??= new Constructor();
    if (context.state === "suspended") void context.resume();
  } catch {
    context = null;
  }
}

function tone(frequency: number, at: number, length: number, volume: number, type: OscillatorType = "sine", glideTo?: number) {
  if (!context) return;
  const start = context.currentTime + at;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (glideTo) oscillator.frequency.exponentialRampToValueAtTime(glideTo, start + length);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + length + 0.02);
}

/** Filtered noise whose band sweeps from `from` to `to` Hz. */
function sweep(from: number, to: number, length: number, volume: number) {
  if (!context) return;
  if (!noise) {
    noise = context.createBuffer(1, Math.round(context.sampleRate * 0.6), context.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  const start = context.currentTime;
  const source = context.createBufferSource();
  source.buffer = noise;
  const band = context.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 6;
  band.frequency.setValueAtTime(from, start);
  band.frequency.exponentialRampToValueAtTime(to, start + length);
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + length * 0.35);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  source.connect(band).connect(gain).connect(context.destination);
  source.start(start);
  source.stop(start + length + 0.02);
}

function play(score: () => void) {
  if (!context || context.state !== "running" || !allowedHere()) return;
  try {
    score();
  } catch {
    // A sound is never worth an error.
  }
}

export const interfaceSounds = {
  tap: () => play(() => tone(2100, 0, 0.035, 0.025, "triangle")),
  warp: () => play(() => {
    sweep(380, 3200, 0.32, 0.05);
    tone(220, 0, 0.3, 0.018, "sine", 880);
  }),
  page: () => play(() => sweep(300, 1200, 0.22, 0.03)),
  reward: () => play(() => {
    tone(880, 0, 0.16, 0.04);
    tone(1320, 0.09, 0.22, 0.04);
  }),
  /* A pass of Yumi's iris scan into sign-in: a low hum rising, a shimmer over it. */
  scan: () => play(() => {
    tone(150, 0, 0.3, 0.014, "sine", 210);
    sweep(900, 2600, 0.3, 0.012);
  }),
  /* The scan locks: two quick ticks, the second lower, as a latch. */
  lock: () => play(() => {
    tone(2600, 0, 0.02, 0.03, "square");
    tone(1960, 0.045, 0.07, 0.024, "triangle");
  }),
  /* An energy capsule clicking open (EnergyReward): a tick and a small chime. */
  capsule: () => play(() => {
    tone(3400, 0, 0.018, 0.026, "square");
    tone(1760, 0.012, 0.07, 0.022, "triangle");
  }),
};

/** The elements a tap ticks for. */
export const SOUNDING = 'button, a[href], [role="button"], [role="tab"], [role="radio"], [role="switch"], [role="menuitem"], summary';
