import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import english from "@/lib/i18n/en";

vi.mock("@/hooks/i18n/useTranslation", () => ({
  default: () => ({ t: english, language: "english" }),
}));

import { VoiceCaptureStatus, usePressToTalk } from "@/components/lexicon/VoiceCapture";
import { WEAK_SIGNAL_HOLD_MS, reportNetworkFailure, reportNetworkSuccess, reportSlowNetwork } from "@/hooks/useOnline";
import useVoiceInput, { micNoticeFor } from "@/hooks/useVoiceInput";
import type { SpeechRecognitionLike } from "@/lib/speechRecognition";
import { detectMicPlatform } from "@/lib/voice/micAccess";
import { closeMicGuide, micGuideOpen, setVoiceDeaf, voiceStage } from "@/lib/voice/signal";

/* =========================================================
   The microphone, when it will not open, and the ways round it
   (Chi, 2026-11-27)

   The Cosmic console said "Microphone access is off. Turn it on in your
   settings" and nobody could tell where those settings were. Now a refusal
   says which kind it is and opens the steps, Yumi wears earmuffs until it
   opens again, a held key talks until it is let go, and a weak signal
   answers with the phone's own hearing first.
   ========================================================= */

const recognizers: SpeechRecognitionLike[] = [];
const recorders: FakeRecorder[] = [];

class FakeRecorder {
  state = "inactive";
  mimeType = "audio/mp4";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor() { recorders.push(this); }
  start() { this.state = "recording"; }
  stop() {
    if (this.state !== "recording") return;
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["speech"], { type: "audio/mp4" }) });
    queueMicrotask(() => this.onstop?.());
  }
}

const track = { stop: vi.fn(), muted: false };
const stream = { getTracks: () => [track], getAudioTracks: () => [track] };

function stubBrowser(getUserMedia: () => Promise<unknown>, vendor = "Google Inc.") {
  vi.stubGlobal("navigator", { vendor, onLine: true, mediaDevices: { getUserMedia: vi.fn(getUserMedia) } });
}

beforeEach(() => {
  recognizers.length = 0;
  recorders.length = 0;
  vi.stubGlobal("SpeechRecognition", class {
    start = vi.fn(); stop = vi.fn(); abort = vi.fn();
    continuous = false;
    constructor() { recognizers.push(this as unknown as SpeechRecognitionLike); }
  });
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  stubBrowser(async () => stream);
  setVoiceDeaf(false);
  closeMicGuide();
});
afterEach(() => {
  reportNetworkSuccess();
  // A weak signal that ended just before now: nothing carries into the next test.
  reportSlowNetwork(Date.now() - WEAK_SIGNAL_HOLD_MS - 1);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const heard = (texts: Array<[string, boolean]>) => ({
  resultIndex: 0,
  results: Object.assign(
    texts.map(([text, isFinal]) => Object.assign([{ transcript: text, confidence: 1 }], { isFinal })),
    { length: texts.length },
  ),
});

describe("a microphone that will not open", () => {
  it("tells a refusal from a busy or missing microphone", () => {
    expect(micNoticeFor({ name: "NotAllowedError" })).toBe("mic-denied");
    expect(micNoticeFor({ name: "SecurityError" })).toBe("mic-denied");
    expect(micNoticeFor({ name: "NotReadableError" })).toBe("mic-busy");
    expect(micNoticeFor({ name: "AbortError" })).toBe("mic-busy");
    expect(micNoticeFor({ name: "NotFoundError" })).toBe("mic-missing");
    expect(micNoticeFor(undefined)).toBe("mic-denied");
  });

  it("says a refusal, keeps saying it until the next try, and puts Yumi's earmuffs on", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    stubBrowser(async () => { throw Object.assign(new Error("no"), { name: "NotAllowedError" }); });
    const { result } = renderHook(() => useVoiceInput({ lang: "en-US", onResult: vi.fn(), onAudio: vi.fn() }));

    await act(async () => { result.current.start(); });
    expect(result.current.notice).toBe("mic-denied");
    expect(voiceStage.deaf).toBe(true);

    // A notice that asks the reader to do something does not fade away.
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
    expect(result.current.notice).toBe("mic-denied");
  });

  it("calls a microphone held by a call busy, and leaves her earmuffs off", async () => {
    stubBrowser(async () => { throw Object.assign(new Error("held"), { name: "NotReadableError" }); });
    const { result } = renderHook(() => useVoiceInput({ lang: "en-US", onResult: vi.fn(), onAudio: vi.fn() }));
    await act(async () => { result.current.start(); });
    expect(result.current.notice).toBe("mic-busy");
    expect(voiceStage.deaf).toBe(false);
  });

  it("takes the earmuffs off as soon as a microphone opens again", async () => {
    setVoiceDeaf(true);
    const { result } = renderHook(() => useVoiceInput({ lang: "en-US", onResult: vi.fn(), onAudio: vi.fn() }));
    await act(async () => { result.current.start(); });
    expect(voiceStage.deaf).toBe(false);
    act(() => result.current.cancel());
  });

  it("offers the way to turn it on, once, and the first tap on Yumi is that way", () => {
    setVoiceDeaf(true);
    expect(voiceStage.deafTold).toBe(false);
    render(<VoiceCaptureStatus phase="idle" listening={false} notice="mic-denied" />);
    expect(screen.getByText(english.lexicon.voice.micDenied, { exact: false })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: english.lexicon.voice.micHowTo }));
    expect(micGuideOpen()).toBe(true);
    // Shown once: after this a tap on her on Standard's home is the ring again.
    expect(voiceStage.deafTold).toBe(true);
  });
});

describe("which device's steps come first", () => {
  const scope = (userAgent: string, extra: Record<string, unknown> = {}, standalone = false) => ({
    navigator: { userAgent, vendor: /Safari/.test(userAgent) && !/Chrome/.test(userAgent) ? "Apple Computer, Inc." : "Google Inc.", ...extra },
    matchMedia: () => ({ matches: standalone }),
  });
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1";
  const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15";

  it.each([
    ["an iPhone Home Screen app", scope(iphone, {}, true), "ios-home"],
    ["the old standalone flag", scope(iphone, { standalone: true }), "ios-home"],
    ["Safari on an iPhone", scope(iphone), "ios-safari"],
    ["an iPad asking for the desktop page", scope(mac, { maxTouchPoints: 5 }), "ios-safari"],
    ["the iPhone app", { ...scope(iphone, {}, true), __yumiPocketKey: { present: false, id: null } }, "ios-app"],
    ["Android", scope("Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36"), "android"],
    ["Safari on a Mac", scope(mac), "mac-safari"],
    ["Firefox", scope("Mozilla/5.0 (Macintosh; Intel Mac OS X 15.0; rv:140.0) Gecko/20100101 Firefox/140.0"), "desktop-firefox"],
    ["Chrome on a computer", scope("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"), "desktop-chrome"],
  ])("%s", (_name, given, expected) => {
    expect(detectMicPlatform(given as never)).toBe(expected);
  });
});

describe("push to talk", () => {
  function Key({ onTap, onHoldStart, onHoldEnd }: { onTap: () => void; onHoldStart: () => void; onHoldEnd: () => void }) {
    const press = usePressToTalk({ phase: "idle", onTap, onHoldStart, onHoldEnd });
    return <button type="button" {...press.bind} data-holding={press.holding || undefined}>mic</button>;
  }

  it("holds after a third of a second, sends on letting go, and swallows the click that follows", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const onTap = vi.fn();
    const onHoldStart = vi.fn();
    const onHoldEnd = vi.fn();
    render(<Key onTap={onTap} onHoldStart={onHoldStart} onHoldEnd={onHoldEnd} />);
    const key = screen.getByRole("button");

    fireEvent.pointerDown(key, { button: 0, pointerId: 1 });
    await act(async () => { await vi.advanceTimersByTimeAsync(340); });
    expect(onHoldStart).toHaveBeenCalledOnce();
    expect(key.getAttribute("data-holding")).toBe("true");

    fireEvent.pointerUp(key, { button: 0, pointerId: 1 });
    fireEvent.click(key);
    expect(onHoldEnd).toHaveBeenCalledOnce();
    expect(onTap).not.toHaveBeenCalled();

    // A quick tap is still a tap.
    fireEvent.pointerDown(key, { button: 0, pointerId: 2 });
    fireEvent.pointerUp(key, { button: 0, pointerId: 2 });
    fireEvent.click(key);
    expect(onTap).toHaveBeenCalledOnce();
    expect(onHoldStart).toHaveBeenCalledOnce();
  });

  it("keeps a held recording open through a pause, and sends it when let go", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance"] });
    // The room first (the meter learns its floor), then the voice, then a pause.
    let loud = false;
    vi.stubGlobal("AudioContext", class {
      resume = vi.fn(async () => undefined);
      close = vi.fn(async () => undefined);
      createMediaStreamSource() { return { connect: vi.fn() }; }
      createAnalyser() { return { fftSize: 1024, getFloatTimeDomainData: (samples: Float32Array) => samples.fill(loud ? 0.3 : 0) }; }
    });
    const onAudio = vi.fn(async () => "handled" as const);
    const { result } = renderHook(() => useVoiceInput({ lang: "en-US", onResult: vi.fn(), onAudio }));

    await act(async () => { result.current.start({ hold: true }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    loud = true;
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    loud = false;
    // Three seconds of quiet would end a tapped recording at 1.2.
    await act(async () => { await vi.advanceTimersByTimeAsync(3_000); });
    expect(result.current.phase).toBe("listening");
    expect(result.current.held).toBe(true);

    await act(async () => { result.current.stop(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(3_000); });
    expect(onAudio).toHaveBeenCalledOnce();
    expect(result.current.phase).toBe("idle");
  });

  it("dictates the whole held sentence once, when it is let go", () => {
    const onResult = vi.fn();
    const { result } = renderHook(() => useVoiceInput({ lang: "en-US", onResult }));
    act(() => result.current.start({ hold: true }));
    const recognizer = recognizers[0];
    expect(recognizer.continuous).toBe(true);

    act(() => {
      recognizer.onresult?.(heard([["Could you", true]]) as never);
      recognizer.onresult?.(heard([["Could you", true], [" pass the salt", true]]) as never);
    });
    expect(onResult).not.toHaveBeenCalled();

    act(() => { result.current.stop(); recognizer.onend?.(); });
    expect(onResult).toHaveBeenCalledOnce();
    expect(onResult).toHaveBeenCalledWith("Could you pass the salt");
  });
});

describe("a weak signal", () => {
  it("lets an iPhone's own recogniser answer at once instead of an upload", () => {
    stubBrowser(async () => stream, "Apple Computer, Inc.");
    // A read gave up for being slow a moment ago: weak for the next second.
    reportSlowNetwork(Date.now() - WEAK_SIGNAL_HOLD_MS + 1_000);
    const onResult = vi.fn();
    const onAudio = vi.fn();
    const { result } = renderHook(() => useVoiceInput({ lang: "en-US", onResult, onAudio }));

    act(() => result.current.start());
    expect(recognizers).toHaveLength(1);
    expect(recorders).toHaveLength(0);

    act(() => recognizers[0].onresult?.(heard([["good morning", true]]) as never));
    expect(onResult).toHaveBeenCalledWith("good morning");
    expect(onAudio).not.toHaveBeenCalled();
    expect(result.current.notice).toBe("weak-local");
  });

  it("answers with the caption, then offers Yumi's hearing once the signal is back", async () => {
    const onResult = vi.fn();
    const onAudio = vi.fn(async () => "handled" as const);
    const transcribe = vi.fn(async () => "Could you pass the salt, please?");
    const { result } = renderHook(() => useVoiceInput({ lang: "en-US", onResult, onAudio, transcribe }));

    await act(async () => { result.current.start(); });
    act(() => recognizers[0].onresult?.(heard([["Could you pass the salt", true]]) as never));
    reportNetworkFailure();
    await act(async () => { result.current.stop(); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

    expect(onResult).toHaveBeenCalledWith("Could you pass the salt");
    expect(onAudio).not.toHaveBeenCalled();
    expect(result.current.notice).toBe("weak-local");

    await act(async () => { reportNetworkSuccess(); await Promise.resolve(); await Promise.resolve(); });
    expect(transcribe).toHaveBeenCalledOnce();
    expect(result.current.better).toBe("Could you pass the salt, please?");

    let taken: string | null = null;
    act(() => { taken = result.current.takeBetter(); });
    expect(taken).toBe("Could you pass the salt, please?");
    expect(result.current.better).toBeNull();
  });

  it("records as ever on an iPhone with no network at all, rather than lose the sentence", async () => {
    stubBrowser(async () => stream, "Apple Computer, Inc.");
    reportNetworkFailure();
    const { result } = renderHook(() => useVoiceInput({ lang: "en-US", onResult: vi.fn(), onAudio: vi.fn() }));
    await act(async () => { result.current.start(); });
    expect(recognizers).toHaveLength(0);
    expect(recorders).toHaveLength(1);
    act(() => result.current.cancel());
  });

  it("keeps a recording nothing could hear, and hears it when the signal is back", async () => {
    stubBrowser(async () => stream, "Apple Computer, Inc.");
    const onAudio = vi
      .fn<(audio: Blob, context: { transcript: string }) => Promise<"handled" | "unavailable">>()
      .mockImplementationOnce(async () => { reportNetworkFailure(); return "unavailable"; })
      .mockImplementation(async () => "handled");
    const { result } = renderHook(() => useVoiceInput({ lang: "en-US", onResult: vi.fn(), onAudio }));

    await act(async () => { result.current.start(); });
    await act(async () => { result.current.stop(); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 2_700)); });
    expect(result.current.notice).toBe("queued");

    await act(async () => { reportNetworkSuccess(); await Promise.resolve(); await Promise.resolve(); });
    expect(onAudio).toHaveBeenCalledTimes(2);
    expect(onAudio.mock.calls[1][1]).toEqual({ transcript: "" });
    expect(result.current.notice).toBeNull();
  });
});
