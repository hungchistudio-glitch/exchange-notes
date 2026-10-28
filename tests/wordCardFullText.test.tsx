import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import WordCardMessage, { isLongText } from "@/components/messages/WordCardMessage";
import english from "@/lib/i18n/en";

/* =========================================================
   A long sentence sent as a card (Chi, 2026-10-24)

   It was cut to one line, with no way to read the rest. Now the words
   wrap to three lines and each reading to one, and a key opens the whole
   card; a sentence is set smaller than a word.

   jsdom lays nothing out, so what is cut is said by stubbing the sizes
   the card measures.
   ========================================================= */

vi.mock("@/hooks/usePhonetics", () => ({
  default: () => (entry: { text: string; language: string }) =>
    entry.language === "en" ? { ipa: "/tu əˈtʃiv ˈivən groʊθ ju ˈiðər tu ˈlɪmɪt ðə fæst ˈgroʊɪŋ triz/" } : undefined,
}));
vi.mock("@/hooks/useDisplayLanguages", () => ({ default: () => ({ learningLanguage: "en", supportLanguage: "zh-TW" }) }));
vi.mock("@/hooks/useTranslatedTexts", () => ({ default: () => () => undefined }));
vi.mock("@/lib/speech", () => ({ speak: vi.fn() }));

const SENTENCE = "To achieve even growth, you either need to limit the fast growing trees or speed up the slower growing ones";
const GLOSS = "要達到均衡的生長，你要嘛限制生長快速的樹木，要嘛加速生長較慢的樹木";

function renderCard(word: string, translation: string) {
  return render(
    <WordCardMessage
      card={{ word, translation, wordLanguage: "en", translationLanguage: "zh-TW" }}
      createdAt="2026-10-24T11:45:00Z"
      learningLanguage="en"
      t={english}
      saved={false}
      saving={false}
      onSave={vi.fn()}
      onShare={vi.fn()}
    />,
  );
}

/** Lays the cut elements out as taller than they are allowed to show. */
function cutEverything() {
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.hasAttribute("data-clamp") ? 120 : 0;
  });
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.hasAttribute("data-clamp") ? 60 : 0;
  });
}

afterEach(() => vi.restoreAllMocks());

describe("a long sentence on a card", () => {
  it("tells a sentence from a word, counting Han characters double", () => {
    expect(isLongText("library")).toBe(false);
    expect(isLongText("圖書館")).toBe(false);
    expect(isLongText(SENTENCE)).toBe(true);
    expect(isLongText(GLOSS)).toBe(true);
    expect(isLongText("要達到均衡的生長，你要嘛限制")).toBe(true);
  });

  it("offers no key when nothing is cut", () => {
    renderCard("library", "圖書館");
    expect(screen.queryByRole("button", { name: "Show full text" })).toBeNull();
    expect(screen.getByText("library")).toHaveClass("text-xl", "line-clamp-3");
  });

  it("cuts to three lines and one per reading, then opens and closes the whole card", () => {
    cutEverything();
    renderCard(SENTENCE, GLOSS);
    const sentence = screen.getByText(SENTENCE);
    const reading = screen.getByText(/^\/tu əˈtʃiv/);
    // A sentence is set smaller than a word.
    expect(sentence).toHaveClass("text-[1.0625rem]", "line-clamp-3");
    expect(sentence).toHaveAttribute("data-overflowing", "true");
    expect(reading).toHaveClass("truncate");

    const key = screen.getByRole("button", { name: "Show full text" });
    expect(key).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(key);
    expect(key).toHaveAttribute("aria-expanded", "true");
    expect(key).toHaveTextContent("Show less");
    expect(screen.getByText(SENTENCE)).not.toHaveClass("line-clamp-3");
    expect(screen.getByText(GLOSS)).not.toHaveClass("line-clamp-3");
    expect(screen.getByText(/^\/tu əˈtʃiv/)).not.toHaveClass("truncate");

    fireEvent.click(key);
    expect(key).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText(SENTENCE)).toHaveClass("line-clamp-3");
  });
});
