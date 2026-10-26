/* =========================================================
   Hangyumi's sound effects (Chi, 2026-10-26: "加輕柔音效，可以關閉")

   A soft tap for a key, two rising notes for a right letter, one low
   note for a wrong one, a little arpeggio for the word, a falling one
   for the end. Synthesised with Web Audio, so there is nothing to
   download; quiet, short, and on unless switched off in the rules sheet.

   The audio context is made (or woken) inside a tap, the only place
   iOS lets it start. Web Audio follows the iPhone's silent switch, so a
   phone on silent stays silent.
   ========================================================= */

const STORAGE_KEY = "hangyumi-sound";

type Context = AudioContext;
let context: Context | null = null;

export function soundsOn(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundsOn(on: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Private mode: the choice lasts the page.
  }
}

/** Call from inside a tap: makes or wakes the audio context. */
export function unlockSounds() {
  if (typeof window === "undefined") return;
  const Constructor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Constructor) return;
  try {
    context ??= new Constructor();
    if (context.state === "suspended") void context.resume();
  } catch {
    context = null;
  }
}

/** One soft note: a quick rise and a gentle fall, never a click. */
function note(frequency: number, at: number, length: number, volume = 0.06, type: OscillatorType = "sine") {
  if (!context) return;
  const start = context.currentTime + at;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + length + 0.02);
}

function play(score: () => void) {
  if (!context || !soundsOn()) return;
  try {
    score();
  } catch {
    // A sound effect is never worth an error.
  }
}

export const sounds = {
  tap: () => play(() => note(880, 0, 0.05, 0.025, "triangle")),
  hit: () => play(() => {
    note(784, 0, 0.16, 0.05);
    note(1175, 0.07, 0.22, 0.045);
  }),
  miss: () => play(() => {
    note(196, 0, 0.26, 0.06, "triangle");
    note(185, 0.04, 0.3, 0.03);
  }),
  win: () => play(() => {
    [784, 988, 1175, 1568].forEach((frequency, index) => note(frequency, index * 0.08, 0.36, 0.05));
    note(2093, 0.34, 0.5, 0.025);
  }),
  lose: () => play(() => {
    [392, 330, 262].forEach((frequency, index) => note(frequency, index * 0.14, 0.42, 0.045, "triangle"));
  }),
};
