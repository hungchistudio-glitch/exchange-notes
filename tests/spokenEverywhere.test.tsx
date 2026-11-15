import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  SpeakKey,
  SpokenReading,
  SpokenText,
  useSpokenProgress,
} from "@/components/speech/Spoken";
import { stopSpeech } from "@/lib/speech";
import {
  followRecording,
  getSpoken,
  isCharByChar,
  playSpoken,
  playSpokenFrom,
  setWordByWord,
  spokenKey,
  stopSpoken,
} from "@/lib/spokenWords";

/* =========================================================
   Every speaker lights the word it is saying (Chi, 2026-11-14)

   Chi asked for it on every speaker key, not only the lookup card's, and
   chose: the marker the lookup card had; a Chinese word lit a character at
   a time with its zhuyin; ▶ and ■ on every key; one word-by-word switch for
   the whole app; a tapped word reading on from there; and a story's full
   play followed down the screen.
   ========================================================= */

type FakeUtterance = {
  text: string;
  onstart?: () => void;
  onend?: () => void;
  onboundary?: (event: { name?: string; charIndex: number }) => void;
};

let said: FakeUtterance[];

beforeEach(() => {
  said = [];
  vi.spyOn(window.speechSynthesis, "speak").mockImplementation((utterance) => {
    said.push(utterance as unknown as FakeUtterance);
  });
});

afterEach(() => {
  stopSpoken();
  setWordByWord(false);
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const lit = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("[data-spoken-now]")).map((mark) => mark.textContent);

describe("a story's full play", () => {
  function Story() {
    const progress = useSpokenProgress("story:1");
    return (
      <div>
        <h2><SpokenText text="Rain returns." lang="en-US" /></h2>
        <p><SpokenText text="Farmers are glad today." lang="en-US" /></p>
        <output>{Math.round(progress * 100)}</output>
      </div>
    );
  }

  it("says the title, then the summary, lighting each in turn, and keeps count of how far it has got", () => {
    const { container } = render(<Story />);

    act(() =>
      playSpoken({
        run: "story:1",
        parts: [
          { text: "Rain returns.", lang: "en-US" },
          { text: "Farmers are glad today.", lang: "en-US" },
        ],
      }),
    );
    expect(said.map((utterance) => utterance.text)).toEqual(["Rain returns."]);

    act(() => said[0].onstart?.());
    expect(lit(container)).toEqual(["Rain"]);

    act(() => said[0].onend?.());
    expect(said.map((utterance) => utterance.text)).toEqual(["Rain returns.", "Farmers are glad today."]);

    act(() => said[1].onstart?.());
    act(() => said[1].onboundary?.({ name: "word", charIndex: 12 }));
    expect(lit(container)).toEqual(["glad"]);
    // The title's two words and the two of the summary before it: 4 of 6.
    expect(screen.getByRole("status").textContent).toBe("67");

    act(() => said[1].onend?.());
    expect(lit(container)).toEqual([]);
    expect(getSpoken()).toBeNull();
  });
});

describe("a tapped word", () => {
  it("reads on from that word while the text is sounding", () => {
    const { container } = render(<p><SpokenText text="Il faut tondre la pelouse." lang="fr-FR" /></p>);
    act(() => playSpoken({ text: "Il faut tondre la pelouse.", lang: "fr-FR" }));
    act(() => said[0].onstart?.());

    /* Where the tap lands: the caret is in "tondre". */
    const text = container.querySelector("[data-segment='4']")!.firstChild!;
    Object.defineProperty(document, "caretRangeFromPoint", {
      configurable: true,
      value: () => ({ startContainer: text, startOffset: 2 }),
    });
    fireEvent.click(container.querySelector("[data-segment='4']")!);

    expect(said.at(-1)!.text).toBe("tondre la pelouse.");
    act(() => said.at(-1)!.onstart?.());
    expect(lit(container)).toEqual(["tondre"]);

    // A boundary in the shorter text is placed back in the whole one.
    act(() => said.at(-1)!.onboundary?.({ name: "word", charIndex: 7 }));
    expect(lit(container)).toEqual(["la"]);
    delete (document as unknown as Record<string, unknown>).caretRangeFromPoint;
  });

  it("starts a silent text only where the text offers it", () => {
    const { container, rerender } = render(<p><SpokenText text="Buenos días." lang="es-ES" /></p>);
    fireEvent.click(container.querySelector("[data-spoken-text]")!);
    expect(said).toHaveLength(0);

    rerender(<p><SpokenText text="Buenos días." lang="es-ES" tapToStart /></p>);
    fireEvent.click(container.querySelector("[data-spoken-text]")!);
    expect(said.map((utterance) => utterance.text)).toEqual(["Buenos días."]);
  });

  it("leaves a word on its own to what it sits in", () => {
    const opened = vi.fn();
    const { container } = render(
      <div role="button" onClick={opened}><SpokenText text="library" lang="en-US" /></div>,
    );
    act(() => playSpoken({ text: "library", lang: "en-US" }));
    fireEvent.click(container.querySelector("[data-spoken-text]")!);
    expect(opened).toHaveBeenCalledTimes(1);
  });
});

describe("a Chinese word on its own", () => {
  it("is lit a character at a time, its zhuyin syllable with it, and a single boundary does not stop it", () => {
    vi.useFakeTimers();
    expect(isCharByChar("圖書館", "zh-TW")).toBe(true);
    expect(isCharByChar("我們明天去圖書館。", "zh-TW")).toBe(false);

    const { container } = render(
      <div>
        <h2><SpokenText text="圖書館" lang="zh-TW" /></h2>
        <p><SpokenReading reading="ㄊㄨˊ ㄕㄨ ㄍㄨㄢˇ" text="圖書館" lang="zh-TW" /></p>
      </div>,
    );

    act(() => playSpoken({ text: "圖書館", lang: "zh-TW", rate: 1 }));
    act(() => said[0].onstart?.());
    expect(lit(container)).toEqual(["圖", "ㄊㄨˊ"]);

    // Safari's one boundary for the whole word, at its start.
    act(() => said[0].onboundary?.({ name: "word", charIndex: 0 }));
    act(() => vi.advanceTimersByTime(220));
    expect(lit(container)).toEqual(["書", "ㄕㄨ"]);
    act(() => vi.advanceTimersByTime(220));
    expect(lit(container)).toEqual(["館", "ㄍㄨㄢˇ"]);
  });

  it("is never said a character at a time, even with the switch on", () => {
    setWordByWord(true);
    act(() => playSpoken({ text: "圖書館", lang: "zh-TW" }));
    expect(said.map((utterance) => utterance.text)).toEqual(["圖書館"]);
  });
});

describe("the one word-by-word switch", () => {
  it("says any sentence a word at a time once it is on, wherever its key is", () => {
    setWordByWord(true);
    act(() => playSpoken({ text: "Farmers are glad.", lang: "en-US" }));
    expect(said.map((utterance) => utterance.text)).toEqual(["Farmers"]);
  });
});

describe("every key", () => {
  it("is ▶ named Play, ■ named Stop while it plays, and stops on a second tap", () => {
    render(<SpeakKey text="Bonjour à tous." lang="fr-FR" />);
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(said).toHaveLength(1);

    const stop = screen.getByRole("button", { name: "Stop" });
    expect(stop).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(stop);
    expect(getSpoken()).toBeNull();
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("goes dark when speech is stopped from anywhere else", () => {
    const { container } = render(<p><SpokenText text="Grazie mille." lang="it-IT" /></p>);
    act(() => playSpoken({ text: "Grazie mille.", lang: "it-IT" }));
    act(() => said[0].onstart?.());
    expect(lit(container)).toEqual(["Grazie"]);

    act(() => stopSpeech());
    expect(lit(container)).toEqual([]);
  });
});

describe("a key that keeps its own state", () => {
  it("is told when another key takes over, but not when a tapped word carries its own run on", () => {
    const first = vi.fn();
    const second = vi.fn();
    act(() => playSpoken({ text: "Uno dos tres.", lang: "es-ES", onCancel: first }));
    act(() => said[0].onstart?.());
    act(() => playSpoken({ text: "Bonjour.", lang: "fr-FR", onCancel: second }));
    expect(first).toHaveBeenCalledTimes(1);

    act(() => {
      expect(playSpokenFrom(spokenKey("Bonjour.", "fr-FR"), 0)).toBe(true);
    });
    expect(second).not.toHaveBeenCalled();

    act(() => stopSpeech());
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe("a recording", () => {
  it("lights its text across its own length", () => {
    vi.useFakeTimers();
    const { container } = render(<p><SpokenText text="你好" lang="zh-TW" /></p>);
    const audio = document.createElement("audio");
    Object.defineProperty(audio, "duration", { value: 1 });

    act(() => {
      followRecording({ text: "你好", lang: "zh-TW" }, audio);
    });
    act(() => {
      audio.dispatchEvent(new Event("playing"));
    });
    expect(lit(container)).toEqual(["你"]);
    act(() => vi.advanceTimersByTime(500));
    expect(lit(container)).toEqual(["好"]);
    act(() => {
      audio.dispatchEvent(new Event("ended"));
    });
    expect(lit(container)).toEqual([]);
  });
});

describe("following the lit word", () => {
  it("brings the next word into view while the reader follows, and leaves them be once they scroll away", () => {
    render(<p><SpokenText text="One two three four." lang="en-US" /></p>);
    const scrolled: string[] = [];
    let offScreen = new Set<string>();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const away = offScreen.has(this.textContent ?? "");
      return { top: away ? 2000 : 200, bottom: away ? 2020 : 220, width: 40, height: 20 } as DOMRect;
    });
    HTMLElement.prototype.scrollIntoView = function (this: HTMLElement) {
      scrolled.push(this.textContent ?? "");
    };

    act(() => playSpoken({ text: "One two three four.", lang: "en-US" }));
    act(() => said[0].onstart?.());

    // "two" is below the fold, and "One" is in view: followed.
    offScreen = new Set(["two"]);
    act(() => said[0].onboundary?.({ name: "word", charIndex: 4 }));
    expect(scrolled).toEqual(["two"]);

    // The reader scrolled away: "two" is out of view now, so "three" is not chased.
    offScreen = new Set(["two", "three"]);
    act(() => said[0].onboundary?.({ name: "word", charIndex: 8 }));
    expect(scrolled).toEqual(["two"]);
  });
});
