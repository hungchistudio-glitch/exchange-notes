import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SpokenText } from "@/components/speech/Spoken";
import type { VocabularyItem } from "@/lib/types/app";
import { buildKnownWords, knownRanges } from "@/lib/vocabulary/knownWords";

/*
 * Chi, 2026-11-15 (新聞裡學過的字發光, 長按查字): a word already in the
 * reader's library glows where it turns up in the news, in every language
 * it was saved with, and a held word is looked up where the reader is.
 */

const item = (word: string, texts: Record<string, string>): VocabularyItem => ({
  id: word, word, translation: texts["zh-TW"] ?? "", word_language: "en", translation_language: "zh-TW",
  texts, examples: {}, status: "learning",
} as unknown as VocabularyItem);

const known = buildKnownWords([
  item("report", { en: "report", "zh-TW": "報告" }),
  item("supply chain", { en: "supply chain", "zh-TW": "供應鏈" }),
  item("launch", { en: "launch", "zh-TW": "發射" }),
]);

const marked = (text: string, tag: string) =>
  knownRanges(text, tag, known).map((range) => text.slice(range.start, range.end));

describe("kept words in what the reader reads", () => {
  it("finds a word in its other forms, and a phrase as a phrase", () => {
    expect(marked("The Reports say the supply chain held after the launched satellite.", "en-US"))
      .toEqual(["Reports", "supply chain", "launched"]);
  });

  it("finds the same words in the Chinese line, by the characters", () => {
    expect(marked("衛星發射後，供應鏈報告顯示穩定。", "zh-TW")).toEqual(["發射", "供應鏈", "報告"]);
  });

  it("does not light part of another word", () => {
    expect(marked("Reportedly unlaunchable.", "en-US")).toEqual([]);
  });
});

describe("the text that shows them", () => {
  afterEach(() => vi.useRealTimers());

  it("marks them while silent, and keeps the mark on the word being said", () => {
    const text = "The report was late.";
    const { container } = render(<p><SpokenText text={text} lang="en-US" marks={knownRanges(text, "en-US", known)} /></p>);
    expect([...container.querySelectorAll("[data-known]")].map((node) => node.textContent)).toEqual(["report"]);
  });

  it("looks a held word up, and the click the hold ends in does not read", () => {
    vi.useFakeTimers();
    const lookUp = vi.fn();
    const spoken = vi.spyOn(window.speechSynthesis, "speak");
    const { container } = render(
      <p><SpokenText text="Il faut tondre la pelouse." lang="fr-FR" tapToStart onLongPressWord={lookUp} /></p>,
    );
    const span = container.querySelector("[data-spoken-text]")!;
    Object.defineProperty(document, "caretRangeFromPoint", {
      configurable: true,
      value: () => ({ startContainer: span.firstChild, startOffset: 9 }),
    });

    fireEvent.pointerDown(span, { clientX: 10, clientY: 10, pointerType: "touch" });
    act(() => vi.advanceTimersByTime(500));
    fireEvent.pointerUp(span);
    fireEvent.click(span);

    // With where the word is drawn, for the news page's laser scan.
    expect(lookUp).toHaveBeenCalledWith("tondre", expect.any(DOMRect));
    expect(spoken).not.toHaveBeenCalled();
    delete (document as unknown as Record<string, unknown>).caretRangeFromPoint;
    spoken.mockRestore();
  });

  it("lets a moving finger scroll instead", () => {
    vi.useFakeTimers();
    const lookUp = vi.fn();
    const { container } = render(<p><SpokenText text="Bonjour à tous." lang="fr-FR" onLongPressWord={lookUp} /></p>);
    const span = container.querySelector("[data-spoken-text]")!;
    fireEvent.pointerDown(span, { clientX: 10, clientY: 10, pointerType: "touch" });
    fireEvent.pointerMove(span, { clientX: 10, clientY: 40 });
    act(() => vi.advanceTimersByTime(500));
    expect(lookUp).not.toHaveBeenCalled();
  });
});
