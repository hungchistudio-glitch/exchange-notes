import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/* =========================================================
   The word cards open on the first tap

   They did not. Every card sits inside a SwipeActionRow, which suppresses
   the click that follows a drag so that swiping a card open does not also
   expand it — and its idea of a drag was four pixels of travel. A thumb
   landing on a card in a scrolling list drifts further than that without
   meaning to, so the first tap was thrown away and the reader tapped again.

   The unit-level guard lives in swipeRowTap.test.tsx. This one is here
   because the report was about the cards, and the cards are what has to keep
   working: it taps the real list, through the real row, at the drifts a real
   finger produces.
   ========================================================= */

vi.mock("@/contexts/VocabularyContext", () => ({
  useVocabulary: () => ({ addItem: () => {}, items: [], loading: false }),
}));

vi.mock("@/contexts/LearningLanguageContext", () => ({
  useLearningLanguageContext: () => ({
    learningLanguage: "en",
    nativeLanguage: "zh-TW",
    languagePair: ["en", "zh-TW"],
    apply: () => {},
    refresh: async () => {},
  }),
}));

const VocabularyList = (await import("@/components/vocabulary/VocabularyList"))
  .default;
type VocabularyItem = import("@/lib/types/app").VocabularyItem;

const word = {
  id: "w0",
  user_id: "u",
  word: "hello",
  translation: "哈囉",
  language: "en",
  word_language: "en",
  translation_language: "zh-TW",
  texts: { en: "hello", "zh-TW": "哈囉" },
  examples: {},
  category: "other",
  favorite: false,
  part_of_speech: null,
  example_sentence: null,
  translated_example: null,
  image_url: null,
  confidence: null,
  status: "learning",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as unknown as VocabularyItem;

function listProps(onToggleExpanded: () => void) {
  return {
    loading: false,
    totalItemCount: 1,
    items: [word],
    query: "",
    updatingId: null,
    expandedItemId: null,
    viewMode: "compact" as const,
    languageFilter: [],
    onLookUpQuery: () => {},
    onChangeStatus: () => {},
    onDeleteItem: () => {},
    onOpenDetail: () => {},
    onToggleExpanded,
    onOpenCollections: () => {},
    onSendToPartner: () => {},
    onInteract: () => {},
  };
}

function tap(element: Element, driftX: number) {
  fireEvent.pointerDown(element, {
    pointerId: 1,
    clientX: 100,
    clientY: 100,
    button: 0,
  });

  if (driftX !== 0) {
    fireEvent.pointerMove(element, {
      pointerId: 1,
      clientX: 100 + driftX,
      clientY: 100,
    });
  }

  fireEvent.pointerUp(element, {
    pointerId: 1,
    clientX: 100 + driftX,
    clientY: 100,
  });

  fireEvent.click(element, { detail: 1 });
}

describe("tapping a word card", () => {
  it("expands on the first tap however much the finger drifts", () => {
    for (const drift of [0, 3, 6, 9]) {
      const toggleExpanded = vi.fn();
      const { unmount } = render(
        <VocabularyList {...listProps(toggleExpanded)} />,
      );

      tap(screen.getByRole("button", { name: /hello/i }), drift);

      expect(
        toggleExpanded,
        `a tap that drifted ${drift}px`,
      ).toHaveBeenCalledTimes(1);

      unmount();
    }
  });

  it("does not expand when the card was actually swiped", () => {
    const toggleExpanded = vi.fn();
    render(<VocabularyList {...listProps(toggleExpanded)} />);

    tap(screen.getByRole("button", { name: /hello/i }), 70);

    expect(toggleExpanded).not.toHaveBeenCalled();
  });
});
