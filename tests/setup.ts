import "@testing-library/jest-dom/vitest";

/*
 * jsdom has no IndexedDB, and the offline layer is built on it. This is a
 * real implementation rather than a stub — the tests below assert on what
 * actually survives a transaction, which is the whole point of testing a
 * store that has to keep a reader's words through a closed app.
 */
import "fake-indexeddb/auto";

/*
 * The five dictionaries, in the cache before anything renders.
 *
 * The app fetches only the language it needs (lib/i18n/index.ts), and
 * useTranslation suspends on the one render where that has not arrived yet.
 * In the browser React covers that with the server's own markup; in a test
 * there is no server, so a component rendered without this would suspend
 * forever and every one of the 110 call sites would need a Suspense wrapper.
 *
 * Priming is the honest fix rather than mocking the module: these are the
 * real dictionaries, so tests that assert on real strings keep asserting on
 * real strings.
 */
import { primeTranslations } from "@/lib/i18n";
import english from "@/lib/i18n/en";
import spanish from "@/lib/i18n/es";
import french from "@/lib/i18n/fr";
import italian from "@/lib/i18n/it";
import traditionalChinese from "@/lib/i18n/zh-TW";

primeTranslations("english", english);
primeTranslations("traditional-chinese", traditionalChinese);
primeTranslations("spanish", spanish);
primeTranslations("french", french);
primeTranslations("italian", italian);

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

/*
 * jsdom has no ResizeObserver, and components that measure themselves rather
 * than assume a size depend on one. A stub that never fires is honest here:
 * a test asserting on a measured layout should set the measurement itself
 * rather than wait for a fake observer to invent one.
 */
if (!("ResizeObserver" in window)) {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
}

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
