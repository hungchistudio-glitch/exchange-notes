import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import ReadingDisplaySettingsButton from "@/components/settings/ReadingDisplaySettingsButton";
import { SpokenText } from "@/components/speech/Spoken";
import { DEFAULT_READING_DISPLAY, setReadingDisplay } from "@/lib/preferences/readingDisplay";

/* =========================================================
   讀音顯示 (Chi, 2026-11-16)

   Korean's one reading line swaps romanization and IPA with ⇄, and the
   swap is remembered; romaji and zhuyin go when the reader turns them off;
   furigana sits over kanji and goes when turned off.
   ========================================================= */

afterEach(() => {
  act(() => setReadingDisplay(DEFAULT_READING_DISPLAY));
});

describe("the reading line", () => {
  it("shows Korean in romanization, and swaps to IPA and back with ⇄", () => {
    render(<PronunciationBlock entries={[{ text: "도서관", language: "ko" }]} />);
    expect(screen.getByText("doseogwan")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show IPA" }));
    expect(screen.getByText("/to.sʌ.ɡwan/")).toBeInTheDocument();
    expect(screen.queryByText("doseogwan")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show romanization" }));
    expect(screen.getByText("doseogwan")).toBeInTheDocument();
  });

  it("shows Japanese kana's romaji, and nothing once romaji is off", () => {
    const { rerender } = render(<PronunciationBlock entries={[{ text: "すし", language: "ja" }]} />);
    expect(screen.getByText("sushi")).toBeInTheDocument();

    act(() => setReadingDisplay({ romaji: false }));
    rerender(<PronunciationBlock entries={[{ text: "すし", language: "ja" }]} />);
    expect(screen.queryByText("sushi")).not.toBeInTheDocument();
  });

  it("hides Korean readings altogether when turned off", () => {
    act(() => setReadingDisplay({ korean: "off" }));
    const { container } = render(<PronunciationBlock entries={[{ text: "도서관", language: "ko" }]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("furigana", () => {
  it("draws a known reading over the kanji, and none when furigana is off", () => {
    const ruby = [{ text: "食", ruby: "た" }, { text: "べる" }];
    const { container, rerender } = render(<SpokenText text="食べる" lang="ja-JP" ruby={ruby} />);
    expect(container.querySelector("ruby.furigana rt")?.textContent).toBe("た");

    rerender(<SpokenText text="食べる" lang="ja-JP" />);
    act(() => setReadingDisplay({ furigana: "off" }));
    expect(container.querySelector("ruby")).toBeNull();
    expect(container.textContent).toBe("食べる");
  });
});

describe("the settings sheet", () => {
  it("offers a group for Japanese, Korean and Chinese, and remembers a choice", async () => {
    render(<ReadingDisplaySettingsButton />);
    fireEvent.click(screen.getByRole("button", { name: /Readings/ }));

    const furigana = await screen.findByRole("radiogroup", { name: "Furigana" });
    expect(furigana).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Word cards only" }));
    expect(JSON.parse(window.localStorage.getItem("reading-display-v1") ?? "{}")).toMatchObject({ furigana: "cards" });

    expect(screen.getByRole("radiogroup", { name: "Zhuyin" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Pinyin" })).toBeInTheDocument();
  });
});
