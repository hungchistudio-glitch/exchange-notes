import { afterEach, expect, it, vi } from "vitest";
import { speak, stopSpeech } from "@/lib/speech";
afterEach(() => { vi.useRealTimers(); });
it("cancels a replacement queued during the iOS-compatible cancel delay", () => {
  vi.useFakeTimers();
  const synth = window.speechSynthesis;
  const play = vi.spyOn(synth, "speak");
  const cancel = vi.spyOn(synth, "cancel");
  vi.spyOn(synth, "speaking", "get").mockReturnValue(true);
  speak("ciao", "it-IT");
  stopSpeech();
  vi.advanceTimersByTime(100);
  expect(cancel).toHaveBeenCalled();
  expect(play).not.toHaveBeenCalled();
});
