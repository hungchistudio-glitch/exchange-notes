import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LanguageCode } from "@/lib/languages";
import type { InterfaceLanguage } from "@/lib/appPreferences";

/* =========================================================
   Two language axes, one field

   The placeholder on the home screen is where confusing the two axes shows
   up most plainly. A reader with a Chinese interface studying French should
   see 搜尋或新增法文單字 — the sentence in the language they read, naming
   the language they study. Not "Search or add a French word", and not
   搜尋或新增中文單字.

   This is the brief's language matrix, asserted at the surface a user
   actually looks at rather than one layer down.
   ========================================================= */

const axes = vi.hoisted(() => ({
  interfaceLanguage: "english" as InterfaceLanguage,
  learning: "fr" as LanguageCode,
  native: "en" as LanguageCode,
}));

const searchSheet = vi.hoisted(() => ({
  openSearch: vi.fn(),
}));

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({
  default: () => axes.interfaceLanguage,
}));

vi.mock("@/contexts/LearningLanguageContext", () => ({
  useLearningLanguageContext: () => ({
    learningLanguage: axes.learning,
    nativeLanguage: axes.native,
  }),
}));

vi.mock("@/contexts/LexiconSearchContext", () => ({
  useLexiconSearchSheet: () => ({
    open: false,
    openSearch: searchSheet.openSearch,
    closeSearch: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const { default: UniversalSearchField } = await import(
  "@/components/lexicon/UniversalSearchField"
);

beforeEach(() => {
  searchSheet.openSearch.mockReset();
});

function placeholderFor(
  interfaceLanguage: InterfaceLanguage,
  learning: LanguageCode,
  native: LanguageCode = "en",
) {
  axes.interfaceLanguage = interfaceLanguage;
  axes.learning = learning;
  axes.native = native;

  const { unmount } = render(<UniversalSearchField />);
  const label = screen.getAllByRole("button")[0].textContent ?? "";

  unmount();
  return label;
}

describe("the home search field's placeholder", () => {
  it("is written in the interface language and names the learning one", () => {
    expect(placeholderFor("english", "fr")).toContain("French");
    expect(placeholderFor("english", "it")).toContain("Italian");
  });

  it("does not fall back to English when the interface is Chinese", () => {
    const label = placeholderFor("traditional-chinese", "fr");

    expect(label).toContain("法文");
    expect(label).not.toContain("French");
    expect(label).not.toContain("Search");
  });

  it("keeps the two axes independent in every interface language", () => {
    // Interface Spanish, learning English: Spanish sentence, English named.
    expect(placeholderFor("spanish", "en")).toContain("Inglés");

    // Interface French, learning Italian.
    expect(placeholderFor("french", "it")).toContain("Italien");

    // Interface Italian, learning Traditional Chinese — the row from the
    // brief that has no English anywhere in it.
    const italian = placeholderFor("italian", "zh-TW", "it");
    expect(italian).toContain("Cinese tradizionale");
    expect(italian).not.toContain("Chinese");
  });

  it("changes when the learning language changes, interface untouched", () => {
    const french = placeholderFor("traditional-chinese", "fr");
    const spanish = placeholderFor("traditional-chinese", "es");

    expect(french).not.toBe(spanish);
    expect(french).toContain("法文");
    expect(spanish).toContain("西班牙文");
  });
});

describe("the field's other two doors", () => {
  it("offers voice and camera beside the text, labelled in the interface language", () => {
    axes.interfaceLanguage = "traditional-chinese";
    axes.learning = "fr";

    render(<UniversalSearchField />);

    // Not "Voice"/"Camera": every control the search adds is translated.
    expect(screen.getByLabelText("語音")).toBeInTheDocument();
    expect(screen.getByLabelText("掃描")).toBeInTheDocument();
  });

  it("keeps text search independent and wires each shortcut to its own action", () => {
    axes.interfaceLanguage = "english";
    axes.learning = "fr";

    render(<UniversalSearchField />);

    const [textSearch] = screen.getAllByRole("button");
    fireEvent.click(textSearch);
    expect(searchSheet.openSearch).toHaveBeenLastCalledWith();

    fireEvent.click(screen.getByRole("button", { name: "Voice" }));
    expect(searchSheet.openSearch).toHaveBeenLastCalledWith({ action: "voice" });

    fireEvent.click(screen.getByRole("button", { name: "Scan" }));
    expect(searchSheet.openSearch).toHaveBeenLastCalledWith({ action: "camera" });
  });
});
