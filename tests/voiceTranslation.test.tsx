import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import english from "@/lib/i18n/en";

vi.mock("@/hooks/i18n/useTranslation", () => ({
  default: () => ({ t: english, language: "english" }),
}));

import YumiInsight from "@/components/lexicon/YumiInsight";
import useVoiceInput from "@/hooks/useVoiceInput";
import { buildClassifyTextPrompt } from "@/lib/ai/prompts/classifyText";
import { classifyQueryKind } from "@/lib/lexicon/queryKind";
import { readInsight } from "@/lib/lexicon/types";
import type { SpeechRecognitionLike } from "@/lib/speechRecognition";

/* =========================================================
   Voice translation (Chi, 2026-10-11)

   The microphone used to stop at the first breath, listen only in the
   language being studied, and ask the model for "the single word or short
   phrase". It now records the whole utterance, hands it to the model, and a
   sentence comes back translated with Yumi's reading of it.
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

const track = { stop: vi.fn() };

beforeEach(() => {
  recognizers.length = 0;
  recorders.length = 0;
  vi.stubGlobal("SpeechRecognition", class {
    start = vi.fn(); stop = vi.fn(); abort = vi.fn();
    constructor() { recognizers.push(this as unknown as SpeechRecognitionLike); }
  });
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  vi.stubGlobal("navigator", {
    mediaDevices: { getUserMedia: vi.fn(async () => ({ getTracks: () => [track] })) },
  });
});
afterEach(() => vi.unstubAllGlobals());

const heard = (text: string, isFinal: boolean) => ({
  resultIndex: 0,
  results: { length: 1, 0: { isFinal, length: 1, 0: { transcript: text, confidence: 1 } } },
});

async function recordAndStop(result: { current: ReturnType<typeof useVoiceInput> }) {
  await act(async () => { result.current.start(); });
  act(() => {
    recognizers[0].onresult?.(heard("Could you", false));
    recognizers[0].onresult?.(heard("Could you pass the salt?", true));
  });
  await act(async () => { result.current.stop(); });
}

describe("recording the whole sentence", () => {
  it("keeps the microphone open through the browser's end of speech and captions what it hears", async () => {
    const onResult = vi.fn();
    const onAudio = vi.fn(async () => "handled" as const);
    const { result } = renderHook(() => useVoiceInput({ lang: "en-US", onResult, onAudio }));

    await act(async () => { result.current.start(); });
    expect(recognizers[0].continuous).toBe(true);

    act(() => recognizers[0].onresult?.(heard("Could you pass", false)));
    expect(result.current.caption).toBe("Could you pass");

    // The recogniser ending on a pause no longer ends the recording.
    act(() => recognizers[0].onend?.());
    expect(result.current.phase).toBe("listening");
    expect(onResult).not.toHaveBeenCalled();
  });

  it("sends the recording to the model and does not also submit the caption", async () => {
    const onResult = vi.fn();
    const onAudio = vi.fn<(audio: Blob, context: { transcript: string }) => Promise<"handled">>(
      async () => "handled",
    );
    const { result } = renderHook(() => useVoiceInput({ lang: "en-US", onResult, onAudio }));

    await recordAndStop(result);

    expect(onAudio).toHaveBeenCalledOnce();
    expect(onAudio.mock.calls[0][1]).toEqual({ transcript: "Could you pass the salt?" });
    expect(onResult).not.toHaveBeenCalled();
    expect(result.current.phase).toBe("idle");
    expect(track.stop).toHaveBeenCalled();
  });

  it("falls back to the caption when the model cannot be reached", async () => {
    const onResult = vi.fn();
    const onAudio = vi.fn(async () => "unavailable" as const);
    const { result } = renderHook(() => useVoiceInput({ lang: "en-US", onResult, onAudio }));

    await recordAndStop(result);

    expect(onResult).toHaveBeenCalledExactlyOnceWith("Could you pass the salt?");
    expect(result.current.notice).toBeNull();
  });

  it("says so when today's allowance is spent", async () => {
    const onAudio = vi.fn(async () => "limit" as const);
    const { result } = renderHook(() => useVoiceInput({ lang: "en-US", onResult: vi.fn(), onAudio }));

    await recordAndStop(result);

    expect(result.current.notice).toBe("limit");
  });

  it("tells the reader it heard nothing rather than going quiet", async () => {
    const onResult = vi.fn();
    const onAudio = vi.fn(async () => "unheard" as const);
    const { result } = renderHook(() => useVoiceInput({ lang: "en-US", onResult, onAudio }));

    await act(async () => { result.current.start(); });
    await act(async () => { result.current.stop(); });

    expect(onResult).not.toHaveBeenCalled();
    expect(result.current.notice).toBe("not-understood");
  });
});

describe("never left spinning", () => {
  it("sends what it caught when a recorder never reports that it stopped", async () => {
    vi.useFakeTimers();
    try {
      const onAudio = vi.fn(async () => "handled" as const);
      const { result } = renderHook(() => useVoiceInput({ lang: "en-US", onResult: vi.fn(), onAudio }));
      await act(async () => { result.current.start(); });
      // A recorder whose stop() hands over its data but never fires onstop.
      recorders[0].onstop = null;
      await act(async () => { result.current.stop(); });
      expect(result.current.phase).toBe("understanding");

      await act(async () => { await vi.advanceTimersByTimeAsync(3_000); });
      expect(onAudio).toHaveBeenCalledOnce();
      expect(result.current.phase).toBe("idle");
    } finally {
      vi.useRealTimers();
    }
  });

  it("still takes dictation's final words when they arrive after Stop", () => {
    const onResult = vi.fn();
    const { result } = renderHook(() => useVoiceInput({ lang: "en-US", onResult }));
    act(() => result.current.start());
    act(() => result.current.stop());
    act(() => recognizers[0].onresult?.(heard("pear", true)));
    expect(onResult).toHaveBeenCalledExactlyOnceWith("pear");
  });
});

describe("a spoken sentence is a sentence", () => {
  it("counts a short punctuated utterance as a sentence", () => {
    expect(classifyQueryKind("沒關係啦。")).toBe("sentence");
    expect(classifyQueryKind("Could you pass the salt?")).toBe("sentence");
    expect(classifyQueryKind("salt")).toBe("word");
  });
});

describe("Yumi's reading", () => {
  const roles = { learning: "en", support: "zh-TW", native: "zh-TW" } as const;

  it("is asked for in the display language, for sentences only", () => {
    const sentence = buildClassifyTextPrompt({
      query: "I'd love to, but I'm swamped this week.",
      roles,
      kind: "sentence",
      explainLanguage: "fr",
    });
    expect(sentence).toContain("insightGist");
    expect(sentence).toContain("insightImplied");
    expect(sentence).toMatch(/Write\s+every "insight" field in French/);

    const word = buildClassifyTextPrompt({ query: "salt", roles, kind: "word" });
    expect(word).not.toContain("insightGist");
  });

  it("keeps a valid reading and drops a malformed one", () => {
    expect(readInsight({ language: "zh-TW", gist: "" })).toBeNull();
    expect(readInsight({ language: "xx", gist: "hi" })).toBeNull();

    const insight = readInsight({
      language: "zh-TW",
      gist: "其實是在婉拒。",
      literal: "",
      tone: "客氣",
      implied: "這週不會去。",
      context: "",
      phrases: [{ phrase: "swamped", note: "忙翻了" }, { phrase: "", note: "x" }, "nope"],
    });
    expect(insight?.phrases).toEqual([{ phrase: "swamped", note: "忙翻了" }]);
  });

  it("shows the point at once and the rest on request", () => {
    render(
      <YumiInsight
        tone="warm"
        phraseLanguage="en"
        insight={{
          language: "en",
          gist: "It's a polite no.",
          literal: "",
          tone: "Warm but firm.",
          implied: "They won't come this week.",
          context: "",
          phrases: [{ phrase: "swamped", note: "very busy" }],
        }}
      />,
    );

    expect(screen.getByText("It's a polite no.")).toBeTruthy();
    expect(screen.queryByText("They won't come this week.")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: english.lexicon.insight.more }));

    expect(screen.getByText("They won't come this week.")).toBeTruthy();
    expect(screen.getByText("Warm but firm.")).toBeTruthy();
    expect(screen.getByText("swamped")).toBeTruthy();
  });

  it("draws nothing for a sentence that came back without one", () => {
    const { container } = render(
      <YumiInsight tone="warm" phraseLanguage="en" insight={undefined} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
