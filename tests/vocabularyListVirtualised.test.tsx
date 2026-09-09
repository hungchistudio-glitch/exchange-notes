import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   Only the rows on screen exist

   The list rendered every word. At 300 that was 24,001 DOM nodes and a
   two-and-a-half second first render, and this is a library meant to grow
   into the thousands — the reader who most needs it to be quick is the one
   it was slowest for.

   Two things are asserted here and they pull in opposite directions on
   purpose: that far fewer rows than words are in the document, and that the
   spacer is still the full height of the list, so the scrollbar describes
   the real thing rather than the window.

   The fallback matters as much. Mounted without the app frame — a test, or
   any surface that has no scroller — it renders everything rather than
   nothing. The failure mode has to be "slow", never "the words are missing".
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

const VIEWPORT_HEIGHT = 800;
const ROW_HEIGHT = 132;

function library(n: number): VocabularyItem[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `w${i}`,
    user_id: "u",
    word: `word${i}`,
    translation: `詞${i}`,
    language: "en",
    word_language: "en",
    translation_language: "zh-TW",
    texts: { en: `word${i}`, "zh-TW": `詞${i}` },
    examples: {},
    category: "other",
    favorite: false,
    part_of_speech: null,
    example_sentence: null,
    translated_example: null,
    image_url: null,
    confidence: null,
    status: "learning",
    created_at: new Date(Date.UTC(2026, 0, 1) + i * 86_400_000).toISOString(),
    updated_at: new Date().toISOString(),
  })) as unknown as VocabularyItem[];
}

function props(items: VocabularyItem[]) {
  return {
    loading: false,
    totalItemCount: items.length,
    items,
    query: "",
    updatingId: null,
    expandedItemId: null,
    viewMode: "cards" as const,
    languageFilter: [],
    onLookUpQuery: () => {},
    onChangeStatus: () => {},
    onDeleteItem: () => {},
    onOpenDetail: () => {},
    onToggleExpanded: () => {},
    onOpenCollections: () => {},
    onSendToPartner: () => {},
    onInteract: () => {},
  };
}

/*
 * jsdom does no layout, so every box is zero — and a virtualiser handed a
 * zero-height viewport quite correctly renders almost nothing. These are the
 * two measurements it actually reads.
 */
function withMeasuredLayout() {
  /*
   * A ResizeObserver that actually reports. The virtualiser learns the
   * viewport's size from this callback, and a stub that never fires leaves it
   * believing the window is zero tall — at which point it correctly renders
   * no rows at all, and the test looks like a bug in the component.
   */
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback(
          [{ target, contentRect: target.getBoundingClientRect() } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    },
  );

  // The virtualiser measures rows through getBoundingClientRect and reads the
  // scroller's clientHeight. Both are zero in jsdom, and a virtualiser told
  // every row is zero tall renders all of them — so these two are stubbed to
  // deterministic values rather than left to collapse.
  vi.spyOn(window.HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const height = this.hasAttribute("data-app-scroll-viewport")
        ? VIEWPORT_HEIGHT
        : ROW_HEIGHT;

      return {
        height,
        width: 375,
        top: 0,
        left: 0,
        right: 375,
        bottom: height,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect;
    },
  );

  Object.defineProperty(window.HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get(this: HTMLElement) {
      return this.hasAttribute("data-app-scroll-viewport")
        ? VIEWPORT_HEIGHT
        : ROW_HEIGHT;
    },
  });
}

function renderInAppFrame(items: VocabularyItem[]) {
  return render(
    <div data-app-scroll-viewport style={{ height: VIEWPORT_HEIGHT, overflowY: "auto" }}>
      <VocabularyList {...props(items)} />
    </div>,
  );
}

beforeEach(() => {
  withMeasuredLayout();
});

describe("a list with no scroller to virtualise against", () => {
  it("renders every word rather than none", () => {
    // The failure mode has to be "slow", never "the reader's words are
    // missing" — a surface without the app frame gets the whole list.
    const { container } = render(<VocabularyList {...props(library(40))} />);

    expect(container.querySelectorAll("[data-index]")).toHaveLength(0);
    expect(screen.getByText("word0")).toBeInTheDocument();
    expect(screen.getByText("word39")).toBeInTheDocument();
  });
});

describe("a list inside the app frame", () => {
  /*
   * jsdom does no layout, and this virtualiser is layout all the way down —
   * how many rows it puts on screen can only be answered by a browser, and it
   * is answered there instead. What is worth pinning here is that finding the
   * scroller flips it onto the windowed path at all, because that lookup is
   * ours and it is the part that can silently stop matching if AppViewport's
   * marker attribute is ever renamed.
   */
  it("switches to the windowed path once it finds the scroller", () => {
    const { container } = renderInAppFrame(library(40));

    const spacer = container.querySelector<HTMLElement>("[aria-label] > div");

    expect(spacer).not.toBeNull();
    expect(spacer?.style.position).toBe("relative");
    expect(container.querySelector("[aria-label]")?.className).not.toContain(
      "space-y",
    );
  });
});
