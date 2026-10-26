import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   Hangyumi's sound effects (lib/hangyumi/sounds.ts)

   Switched off, they must not so much as open an audio context: on a
   phone that is enough to disturb music playing in another app.
   ========================================================= */

const created = vi.fn();
class FakeContext {
  state = "running";
  currentTime = 0;
  destination = {};
  constructor() { created(); }
  resume() { return Promise.resolve(); }
  createOscillator() { return { type: "", frequency: { setValueAtTime() {} }, connect: (node: unknown) => node, start() {}, stop() {} }; }
  createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (node: unknown) => node }; }
}

beforeEach(() => {
  vi.resetModules();
  created.mockReset();
  window.localStorage.clear();
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeContext;
});
afterEach(() => {
  delete (window as unknown as { AudioContext?: unknown }).AudioContext;
});

describe("Hangyumi's sound effects", () => {
  it("open no audio at all while switched off", async () => {
    const { setSoundsOn, sounds, unlockSounds } = await import("@/lib/hangyumi/sounds");
    setSoundsOn(false);
    unlockSounds();
    sounds.hit();
    expect(created).not.toHaveBeenCalled();
  });

  it("open one context, inside the tap, when on", async () => {
    const { soundsOn, sounds, unlockSounds } = await import("@/lib/hangyumi/sounds");
    expect(soundsOn()).toBe(true);
    unlockSounds();
    unlockSounds();
    sounds.win();
    expect(created).toHaveBeenCalledTimes(1);
  });
});
