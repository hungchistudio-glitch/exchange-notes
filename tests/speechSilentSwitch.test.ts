import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { speakText } from "@/lib/pronunciation/playback";
import { unlockSounds } from "@/lib/hangyumi/sounds";
import { isAppleTouchDevice, speak } from "@/lib/speech";

/* =========================================================
   Every speaker, through an iPhone's silent switch

   iOS mutes Safari's speech synthesis on silent. Before speaking, on an
   iPhone or iPad, the app asks for playback audio — the Audio Session
   API, then a moment of silence through an <audio> element — in the tap
   itself and strictly before speechSynthesis.speak, which is what the
   silent switch respects. On anything else, neither: a Mac would show the
   silent clip in Now Playing. Confirmed on a real iPhone on the hello
   page (PR #190) before it was given to every speaker.
   ========================================================= */

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";

const order: string[] = [];
type AudioSessionNavigator = Navigator & { audioSession: { type: string } };

function asDevice(agent: string, touchPoints: number) {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(agent);
  Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, get: () => touchPoints });
}

beforeEach(() => {
  order.length = 0;
  /* tests/setup.ts stands in a bare Audio; this one can be told playsinline. */
  vi.stubGlobal(
    "Audio",
    class {
      currentTime = 0;
      preload = "";
      setAttribute() {}
      play() {
        order.push("silence");
        return Promise.resolve();
      }
    },
  );
  URL.createObjectURL = vi.fn(() => "blob:silence");
  Object.defineProperty(navigator, "audioSession", { configurable: true, value: { type: "auto" } });
  vi.spyOn(window.speechSynthesis, "speak").mockImplementation(() => {
    order.push("speak");
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("on an iPhone or iPad", () => {
  it("asks for playback audio before the word is spoken", () => {
    asDevice(IPHONE, 5);
    speak("library", "en-US");
    expect((navigator as AudioSessionNavigator).audioSession.type).toBe("playback");
    expect(order).toEqual(["silence", "speak"]);
  });

  it("does the same for the Pronunciation Lab's word cards", () => {
    asDevice(IPHONE, 5);
    speakText("圖書館", "zh-TW");
    expect(order).toEqual(["silence", "speak"]);
  });

  it("counts an iPad that reports itself as a Mac", () => {
    asDevice(MAC, 5);
    expect(isAppleTouchDevice()).toBe(true);
  });
});

describe("the games' sound effects", () => {
  it("keep to the silent switch after a word is spoken: the next tap is ambient again", () => {
    // Chi, 2026-10-28: words are heard on silent, the games' effects are not.
    asDevice(IPHONE, 5);
    window.localStorage.removeItem("hangyumi-sound");
    vi.stubGlobal("AudioContext", class { state = "running"; resume() { return Promise.resolve(); } });
    speak("library", "en-US");
    expect((navigator as AudioSessionNavigator).audioSession.type).toBe("playback");
    unlockSounds();
    expect((navigator as AudioSessionNavigator).audioSession.type).toBe("ambient");
  });
});

describe("anywhere else", () => {
  it("speaks with neither", () => {
    asDevice(MAC, 0);
    expect(isAppleTouchDevice()).toBe(false);
    speak("library", "en-US");
    expect(order).toEqual(["speak"]);
    expect((navigator as AudioSessionNavigator).audioSession.type).toBe("auto");
  });
});
