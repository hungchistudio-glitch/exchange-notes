import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import english from "@/lib/i18n/en";

vi.mock("@/hooks/i18n/useTranslation", () => ({
  default: () => ({ t: english, language: "english" }),
}));

import MicCheckSheet from "@/components/settings/MicCheckSheet";
import useVoiceInput from "@/hooks/useVoiceInput";
import { beginCapture, capturing, preferAudioSession } from "@/lib/audio/session";
import { micDiagnostic, openMicrophone } from "@/lib/voice/micAccess";
import { setVoiceDeaf, voiceStage } from "@/lib/voice/signal";

/* =========================================================
   The microphone and the page's audio session (Chi, 2026-11-27: Safari's
   microphone set to Allow, and still "access is off")

   The interface's ticks set navigator.audioSession to "ambient" on every
   press, and a speaker sets "playback". On an iPhone neither has an input,
   so getUserMedia failed at once whatever Settings said. Every capture now
   asks for "play-and-record" in the tap and holds it until it ends.
   ========================================================= */

class FakeRecorder {
  state = "inactive";
  mimeType = "audio/mp4";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
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
const audioSession = { type: "auto" };
const refusal = () => Object.assign(new Error("No AVAudioSessionCaptureDevice"), { name: "NotAllowedError" });

function iphone(getUserMedia: () => Promise<unknown>) {
  const asked: string[] = [];
  vi.stubGlobal("navigator", {
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1",
    vendor: "Apple Computer, Inc.",
    onLine: true,
    standalone: true,
    audioSession,
    mediaDevices: {
      // What the session was at the moment the microphone was asked for.
      getUserMedia: vi.fn(() => { asked.push(audioSession.type); return getUserMedia(); }),
      enumerateDevices: vi.fn(async () => [{ kind: "audioinput" }]),
    },
  });
  return asked;
}

beforeEach(() => {
  audioSession.type = "auto";
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  setVoiceDeaf(false);
  voiceStage.lastError = null;
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("the audio session around a capture", () => {
  it("holds play-and-record while a microphone is open, and the sounds wait", () => {
    vi.stubGlobal("navigator", { audioSession });
    preferAudioSession("ambient");
    expect(audioSession.type).toBe("ambient");

    const end = beginCapture();
    expect(audioSession.type).toBe("play-and-record");
    expect(capturing()).toBe(true);
    // A tick or a speaker in the middle of a recording leaves it alone.
    preferAudioSession("ambient");
    preferAudioSession("playback");
    expect(audioSession.type).toBe("play-and-record");

    end();
    end();
    expect(capturing()).toBe(false);
    expect(audioSession.type).toBe("auto");
  });

  it("asks for the record session before the microphone, even after the interface ticked", async () => {
    audioSession.type = "ambient";
    const asked = iphone(async () => stream);
    const { result } = renderHook(() => useVoiceInput({ lang: "en-US", onResult: vi.fn(), onAudio: vi.fn() }));
    await act(async () => { result.current.start(); });
    expect(asked).toEqual(["play-and-record"]);
    expect(result.current.phase).toBe("listening");

    act(() => result.current.cancel());
    expect(audioSession.type).toBe("auto");
  });

  it("asks again another way once, and listens when the second ask is answered", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let calls = 0;
    iphone(async () => { calls += 1; if (calls === 1) throw refusal(); return stream; });
    const { result } = renderHook(() => useVoiceInput({ lang: "en-US", onResult: vi.fn(), onAudio: vi.fn() }));
    await act(async () => { result.current.start(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(calls).toBe(2);
    expect(result.current.phase).toBe("listening");
    expect(result.current.notice).toBeNull();
    act(() => result.current.cancel());
  });

  it("keeps the browser's own words when both asks are refused", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    audioSession.type = "ambient";
    iphone(async () => { throw refusal(); });
    const { result } = renderHook(() => useVoiceInput({ lang: "en-US", onResult: vi.fn(), onAudio: vi.fn() }));
    await act(async () => { result.current.start(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(result.current.notice).toBe("mic-denied");
    expect(voiceStage.lastError).toMatchObject({
      name: "NotAllowedError",
      message: "No AVAudioSessionCaptureDevice",
      session: "ambient→play-and-record",
      retried: true,
    });
    expect(audioSession.type).toBe("auto");
  });
});

describe("the check-up's diagnostic", () => {
  it("writes the refusal, the session and the device into one line", async () => {
    iphone(async () => { throw refusal(); });
    const tried = await openMicrophone();
    expect(tried.ok).toBe(false);
    if (tried.ok) return;
    const code = await micDiagnostic(tried.failure);
    expect(code).toContain("ios-home | iOS 26.1 | Safari");
    expect(code).toContain("NotAllowedError: No AVAudioSessionCaptureDevice");
    expect(code).toContain("session auto→play-and-record");
    expect(code).toContain("inputs 1");
    expect(code).toContain("retried y");
    expect(code.length).toBeLessThanOrEqual(500);
  });

  it("says a stuck iPhone audio is not a setting, and sends the code to the owner", async () => {
    iphone(async () => { throw refusal(); });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const copy = english.settings.microphone;
    render(<MicCheckSheet open onClose={vi.fn()} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.start })); });

    await waitFor(() => expect(screen.getByText(english.lexicon.voice.guide.notSettings)).toBeTruthy());
    expect(screen.getByRole("button", { name: english.lexicon.voice.guide.reload })).toBeTruthy();
    // Not the Settings steps: they would not help here.
    expect(screen.queryByText(english.lexicon.voice.guide.steps["ios-home"][0])).toBeNull();

    const code = await waitFor(() => {
      const shown = document.querySelector("[data-mic-diagnostic]")?.textContent;
      expect(shown).toBeTruthy();
      return shown!;
    });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.send })); });
    await waitFor(() => expect(screen.getByText(copy.sent)).toBeTruthy());
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/reports");
    expect(JSON.parse(String(init.body))).toMatchObject({ surface: "device", itemKey: "microphone", quoted: code });
  });
});
