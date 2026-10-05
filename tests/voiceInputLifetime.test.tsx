import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import useVoiceInput from "@/hooks/useVoiceInput";
import type { SpeechRecognitionLike } from "@/lib/speechRecognition";

const recognizers: SpeechRecognitionLike[] = [];
let allowMicrophone: (stream: MediaStream) => void;
beforeEach(() => {
  recognizers.length = 0;
  vi.stubGlobal("SpeechRecognition", class {
    start = vi.fn(); stop = vi.fn(); abort = vi.fn();
    constructor() { recognizers.push(this as unknown as SpeechRecognitionLike); }
  });
  vi.stubGlobal("MediaRecorder", class {});
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn(() => new Promise<MediaStream>(resolve => { allowMicrophone = resolve; })) } });
});
afterEach(() => vi.unstubAllGlobals());

it("releases microphone permission that arrives after stop", async () => {
  const track = { stop: vi.fn() };
  const { result } = renderHook(() => useVoiceInput({ lang: "en-US", onResult: vi.fn(), onAudio: vi.fn() }));
  act(() => result.current.start());
  act(() => result.current.stop());
  await act(async () => allowMicrophone({ getTracks: () => [track] } as unknown as MediaStream));
  expect(track.stop).toHaveBeenCalledOnce();
  expect(result.current.listening).toBe(false);
});

it("ignores old recognition callbacks after cancellation and a new recording", () => {
  const onResult = vi.fn();
  const { result } = renderHook(() => useVoiceInput({ lang: "fr-FR", onResult }));
  act(() => result.current.start());
  const old = recognizers[0];
  act(() => { result.current.cancel(); result.current.start(); });
  act(() => {
    old.onend?.();
    old.onresult?.({ resultIndex: 0, results: { length: 1, 0: { isFinal: true, length: 1, 0: { transcript: "old", confidence: 1 } } } });
  });
  expect(result.current.listening).toBe(true);
  expect(onResult).not.toHaveBeenCalled();
});

it("submits final speech once, without sending every interim syllable", () => {
  const onResult = vi.fn();
  const { result } = renderHook(() => useVoiceInput({ lang: "es-ES", onResult }));
  act(() => result.current.start());
  const event = (isFinal: boolean) => ({ resultIndex: 0, results: { length: 1, 0: { isFinal, length: 1, 0: { transcript: "hola", confidence: 1 } } } });
  act(() => { recognizers[0].onresult?.(event(false)); recognizers[0].onresult?.(event(true)); });
  expect(onResult).toHaveBeenCalledExactlyOnceWith("hola");
});
