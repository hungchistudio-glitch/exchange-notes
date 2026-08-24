import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { LanguageCode } from "@/lib/languages";

/* =========================================================
   The control that opens the language filter

   Written after the pill shipped dead. The state flipped and nothing
   appeared: the vocabulary page mounts its overlay tree on demand, behind a
   hand-written list of "which overlays count as open" that lived in a
   different file from the props it described — so a new overlay was invisible
   to the thing that decides whether to load any overlay at all.

   The gate now sits beside the props in useVocabularyPage. These cover the
   two halves either side of it: the pill reports the press, and the sheet
   does something with it.
   ========================================================= */

const preferences = vi.hoisted(() => ({ interfaceLanguage: "english" }));

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({
  default: () => preferences.interfaceLanguage,
}));

vi.mock("@/contexts/LearningLanguageContext", () => ({
  useLearningLanguageContext: () => ({
    learningLanguage: "it",
    nativeLanguage: "zh-TW",
  }),
}));

vi.mock("@/hooks/useVoiceInput", () => ({
  default: () => ({ supported: false, listening: false, toggle: () => {} }),
}));

const { default: VocabularySearch } = await import(
  "@/components/vocabulary/VocabularySearch"
);
const { default: LanguageFilterSheet } = await import(
  "@/components/vocabulary/LanguageFilterSheet"
);

function renderSearch(
  overrides: Partial<React.ComponentProps<typeof VocabularySearch>> = {},
) {
  const onOpenLanguageFilter = vi.fn();

  render(
    <VocabularySearch
      query=""
      quickFilter="all"
      quickFilters={[]}
      visibleCount={5}
      sortMode="new"
      viewMode="cards"
      onQueryChange={() => {}}
      onClear={() => {}}
      onQuickFilterChange={() => {}}
      onOpenSort={() => {}}
      onOpenCollections={() => {}}
      onOpenLanguageFilter={onOpenLanguageFilter}
      onToggleView={() => {}}
      languageFilter={[]}
      languageCount={3}
      {...overrides}
    />,
  );

  return { onOpenLanguageFilter };
}

describe("the language filter pill", () => {
  it("reports the press", async () => {
    const { onOpenLanguageFilter } = renderSearch();

    await userEvent.click(screen.getByLabelText("Filter by language"));

    expect(onOpenLanguageFilter).toHaveBeenCalledTimes(1);
  });

  it("says which language is showing", () => {
    renderSearch({ languageFilter: ["fr"] });

    expect(screen.getByText("Français")).toBeInTheDocument();
  });

  it("says so when nothing is filtered", () => {
    renderSearch();

    expect(screen.getByText("All languages")).toBeInTheDocument();
  });

  it("is not there at all when the library speaks one language", () => {
    // A control that can only be set to the value it already has is furniture.
    renderSearch({ languageCount: 1 });

    expect(screen.queryByLabelText("Filter by language")).toBeNull();
  });
});

describe("the language filter sheet", () => {
  const counts = new Map<LanguageCode, number>([
    ["en", 62],
    ["fr", 24],
    ["it", 15],
  ]);

  it("lists every language the library holds, with its real count", () => {
    render(
      <LanguageFilterSheet
        open
        selected={[]}
        counts={counts}
        totalCount={101}
        onClose={() => {}}
        onChange={() => {}}
      />,
    );

    expect(screen.getByText("All languages")).toBeInTheDocument();
    expect(screen.getByText("101")).toBeInTheDocument();
    expect(screen.getByText("Français")).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
  });

  it("reports a choice as a list, and closes", async () => {
    const onChange = vi.fn();
    const onClose = vi.fn();

    render(
      <LanguageFilterSheet
        open
        selected={[]}
        counts={counts}
        totalCount={101}
        onClose={onClose}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByText("Français"));

    // A list, not a code: single-select is the interface, never the state.
    expect(onChange).toHaveBeenCalledWith(["fr"]);
    expect(onClose).toHaveBeenCalled();
  });

  it("clears back to every language", async () => {
    const onChange = vi.fn();

    render(
      <LanguageFilterSheet
        open
        selected={["fr"]}
        counts={counts}
        totalCount={101}
        onClose={() => {}}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByText("All languages"));

    expect(onChange).toHaveBeenCalledWith([]);
  });
});
