import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SpeechRecognitionEventLike, SpeechRecognitionLike } from "@/lib/speechRecognition";
import { resetVoiceSignal, voiceSignal } from "@/lib/voice/signal";

/* =========================================================
   The library's voice search, dictating (Chi, 2026-11-12)

   "發聲時收音動畫並沒反應": the field dictates through the browser's
   recogniser alone, so nothing metered the voice and the sea at the bottom
   of the screen rose and lay still. Now the animation hears the voice: the
   microphone's level on a computer, the recogniser's news of each word on a
   phone, where a second listener would silence the first.

   "再次按下收音按鍵收音時，應該自動刪除原先上回收音的字": a new dictation
   starts from an empty field, and the words go in as they are said.
   ========================================================= */

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({ default: () => "english" }));
vi.mock("@/contexts/LearningLanguageContext", () => ({
  useLearningLanguageContext: () => ({ learningLanguage: "it", nativeLanguage: "zh-TW" }),
}));
vi.mock("@/contexts/LexiconSearchContext", () => ({
  useLexiconSearchSheet: () => ({ openSearch: vi.fn() }),
}));
vi.mock("@/hooks/lexicon/useLexiconImageLookup", () => ({
  default: () => ({ reading: false, error: "", handleFile: vi.fn(), handleCapture: vi.fn() }),
}));

const { default: useVoiceInput } = await import("@/hooks/useVoiceInput");
const { default: VocabularySearch } = await import("@/components/vocabulary/VocabularySearch");

const IPHONE = {
  vendor: "Apple Computer, Inc.",
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
};
const ANDROID = {
  vendor: "Google Inc.",
  userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
};
const COMPUTER = {
  vendor: "Google Inc.",
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
};

const recognizers: SpeechRecognitionLike[] = [];
const track = { stop: vi.fn() };
const stream = { getTracks: () => [track], getAudioTracks: () => [track] } as unknown as MediaStream;
let getUserMedia: ReturnType<typeof vi.fn>;

function device(identity: { vendor: string; userAgent: string }, microphone: () => Promise<MediaStream> = async () => stream) {
  getUserMedia = vi.fn(microphone);
  vi.stubGlobal("navigator", { ...identity, mediaDevices: { getUserMedia } });
}

/* Frames run by hand, so a test can say how long the voice has been heard. */
const frames = new Map<number, FrameRequestCallback>();
let lastFrame = 0;
let clock = 0;
function runFrames(count: number) {
  for (let i = 0; i < count; i += 1) {
    const due = [...frames.values()];
    frames.clear();
    clock += 16;
    for (const callback of due) callback(clock);
  }
}

/* A microphone that hears a steady, loud voice. */
class LoudAudioContext {
  sampleRate = 48000;
  resume = vi.fn(async () => {});
  close = vi.fn(async () => {});
  createMediaStreamSource() {
    return { connect() {}, disconnect() {} };
  }
  createAnalyser() {
    return {
      fftSize: 1024,
      frequencyBinCount: 512,
      context: this,
      getFloatTimeDomainData(samples: Float32Array) { samples.fill(0.2); },
      getByteFrequencyData(bins: Uint8Array) { bins.fill(200); },
    };
  }
}

function heard(words: string, isFinal = false): SpeechRecognitionEventLike {
  return { resultIndex: 0, results: { length: 1, 0: { isFinal, length: 1, 0: { transcript: words, confidence: 1 } } } };
}

beforeEach(() => {
  recognizers.length = 0;
  frames.clear();
  track.stop.mockClear();
  resetVoiceSignal();
  vi.stubGlobal("SpeechRecognition", class {
    start = vi.fn(); stop = vi.fn(); abort = vi.fn();
    constructor() { recognizers.push(this as unknown as SpeechRecognitionLike); }
  });
  vi.stubGlobal("AudioContext", LoudAudioContext);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    lastFrame += 1;
    frames.set(lastFrame, callback);
    return lastFrame;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => { frames.delete(id); });
});
afterEach(() => vi.unstubAllGlobals());

describe("the library's dictation, as the animation hears it", () => {
  it.each([
    ["an iPhone", IPHONE],
    ["Android", ANDROID],
  ])("on %s, swells with each word the recogniser hears and opens no second microphone", (_, identity) => {
    device(identity);
    const onCaption = vi.fn();
    const { result } = renderHook(() => useVoiceInput({ lang: "it-IT", onResult: vi.fn(), onCaption }));
    act(() => result.current.start());
    runFrames(2);
    expect(voiceSignal.level).toBe(0);

    act(() => {
      recognizers[0].onspeechstart?.();
      recognizers[0].onresult?.(heard("buona"));
    });
    runFrames(3);
    expect(voiceSignal.level).toBeGreaterThan(0.2);
    expect(voiceSignal.high).toBeGreaterThan(0);
    expect(onCaption).toHaveBeenLastCalledWith("buona");
    expect(getUserMedia).not.toHaveBeenCalled();

    act(() => recognizers[0].onend?.());
    runFrames(1);
    expect(voiceSignal.level).toBe(0);
  });

  it("on a computer, follows the microphone's own level, and lets it go when the dictation ends", async () => {
    device(COMPUTER);
    const ring = document.createElement("span");
    const { result } = renderHook(() => useVoiceInput({ lang: "it-IT", onResult: vi.fn() }));
    act(() => { result.current.bindLevel(ring); });
    act(() => result.current.start());
    await act(async () => {});
    expect(getUserMedia).toHaveBeenCalledOnce();

    runFrames(3);
    expect(voiceSignal.level).toBeGreaterThan(0.3);
    expect(Number(ring.style.getPropertyValue("--voice-level"))).toBeGreaterThan(0.3);

    act(() => recognizers[0].onend?.());
    expect(track.stop).toHaveBeenCalled();
    runFrames(1);
    expect(voiceSignal.level).toBe(0);
    expect(ring.style.getPropertyValue("--voice-level")).toBe("0.000");
  });

  it("lets go of a microphone that arrives after the dictation has ended", async () => {
    let allow: (value: MediaStream) => void = () => {};
    device(COMPUTER, () => new Promise<MediaStream>(resolve => { allow = resolve; }));
    const { result } = renderHook(() => useVoiceInput({ lang: "it-IT", onResult: vi.fn() }));
    act(() => result.current.start());
    act(() => recognizers[0].onend?.());
    await act(async () => allow(stream));
    expect(track.stop).toHaveBeenCalledOnce();
    runFrames(2);
    expect(voiceSignal.level).toBe(0);
  });
});

function Field({ initial }: { initial: string }) {
  const [query, setQuery] = useState(initial);
  return (
    <VocabularySearch
      query={query}
      onQueryChange={setQuery}
      onClear={() => setQuery("")}
      quickFilter="all"
      quickFilters={[]}
      visibleCount={0}
      sortMode="new"
      viewMode="cards"
      onQuickFilterChange={() => {}}
      onOpenSort={() => {}}
      onOpenCollections={() => {}}
      onOpenLanguageFilter={() => {}}
      onToggleView={() => {}}
      languageFilter={[]}
      languageCount={1}
    />
  );
}

describe("the library's search field while it dictates", () => {
  it("starts each dictation from an empty field and types the words in as they are said", () => {
    device(IPHONE);
    const { container } = render(<Field initial="ciao" />);
    const input = container.querySelector<HTMLInputElement>("[data-vocabulary-search-input]")!;

    fireEvent.click(screen.getByRole("button", { name: "Search by voice" }));
    expect(input.value).toBe("");

    act(() => recognizers[0].onresult?.(heard("buona")));
    expect(input.value).toBe("buona");
    act(() => recognizers[0].onresult?.(heard("buonanotte", true)));
    expect(input.value).toBe("buonanotte");
    act(() => recognizers[0].onend?.());

    // The next dictation clears the last one's words at once.
    fireEvent.click(screen.getByRole("button", { name: "Search by voice" }));
    expect(input.value).toBe("");
    expect(recognizers).toHaveLength(2);
  });

  it("keeps the words heard so far when the reader taps to stop", () => {
    device(IPHONE);
    const { container } = render(<Field initial="" />);
    const input = container.querySelector<HTMLInputElement>("[data-vocabulary-search-input]")!;

    fireEvent.click(screen.getByRole("button", { name: "Search by voice" }));
    act(() => recognizers[0].onresult?.(heard("arrivederci")));
    fireEvent.click(screen.getByRole("button", { name: "Listening — tap to stop" }));
    expect(input.value).toBe("arrivederci");
  });
});
