import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import useRecorder from "@/hooks/pronunciation/useRecorder";
import { createSpeechRecognitionAnalyzer } from "@/lib/pronunciation/lab/analyzer";
import type { SpeechRecognitionLike } from "@/lib/speechRecognition";
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
it("discards late microphone permission when the target changed", async () => {
  let permit!: (stream: MediaStream) => void;
  const stop = vi.fn();
  vi.stubGlobal("MediaRecorder", class { static isTypeSupported = () => true; });
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: () => new Promise<MediaStream>(resolve => { permit = resolve; }) } });
  const { result } = renderHook(() => useRecorder());
  let started!: Promise<boolean>;
  act(() => { started = result.current.start(); });
  act(() => result.current.discard());
  await act(async () => { permit({ getTracks: () => [{ stop }] } as unknown as MediaStream); await started; });
  expect(stop).toHaveBeenCalledOnce();
  expect(result.current.state.status).toBe("idle");
  await expect(started).resolves.toBe(false);
});
it("cancel settles the previous analyzer and its timer cannot abort the next one", async () => {
  vi.useFakeTimers();
  const instances: SpeechRecognitionLike[] = [];
  vi.stubGlobal("SpeechRecognition", class {
    start = vi.fn(); abort = vi.fn();
    constructor() { instances.push(this as unknown as SpeechRecognitionLike); }
  });
  const analyzer = createSpeechRecognitionAnalyzer();
  const input = { language: "es" as const, targetText: "perro", dimensions: ["sound"] as const };
  const first = analyzer.analyze(input);
  analyzer.cancel();
  await expect(first).resolves.toMatchObject({ failure: "aborted", overall: null });
  const second = analyzer.analyze(input);
  instances[1].onresult?.({ resultIndex: 0, results: { length: 1, 0: { isFinal: true, length: 2, 0: { transcript: "gato", confidence: 0.9 }, 1: { transcript: "perro", confidence: 0.1 } } } });
  instances[1].onend?.();
  await expect(second).resolves.toMatchObject({ transcript: "gato", verdict: "incorrect" });
  expect(vi.getTimerCount()).toBe(0);
});
it("does not start listening for an already cancelled analysis", async () => {
  const start = vi.fn();
  vi.stubGlobal("SpeechRecognition", class { start = start; abort = vi.fn(); });
  const controller = new AbortController(); controller.abort();
  await expect(createSpeechRecognitionAnalyzer().analyze({ language: "en", targetText: "hello", dimensions: ["sound"], signal: controller.signal })).resolves.toMatchObject({ failure: "aborted" });
  expect(start).not.toHaveBeenCalled();
});
