import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/*
 * jsdom implements no audio and no speech, and every screen in the
 * Pronunciation Lab touches both. These are stubs rather than fakes: they
 * exist so a render does not throw, and no test asserts anything about what
 * they did — a test that passed because a stub returned a plausible score
 * would be exactly the dishonesty the analyzer is built to avoid.
 */

class SilentAudio {
  currentTime = 0;
  playbackRate = 1;
  play() {
    return Promise.resolve();
  }
  pause() {}
  addEventListener() {}
  removeEventListener() {}
}

vi.stubGlobal("Audio", SilentAudio);

vi.stubGlobal("speechSynthesis", {
  speak: () => {},
  cancel: () => {},
  getVoices: () => [],
  addEventListener: () => {},
  removeEventListener: () => {},
  speaking: false,
  pending: false,
});

vi.stubGlobal(
  "SpeechSynthesisUtterance",
  class {
    lang = "";
    rate = 1;
    pitch = 1;
    voice: unknown = null;
    constructor(public text: string) {}
  },
);

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

afterEach(cleanup);
