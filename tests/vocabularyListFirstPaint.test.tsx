import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import type { VocabularyItem } from "@/lib/types/app";

/*
 * The list is virtualised, but virtualisation only started once the component
 * knew which element scrolls — and that was discovered in a layout effect,
 * i.e. after a render had already been committed. So the first commit built
 * every row in the library and the second threw all but a screenful away.
 * Scrolling was fast; arriving was not, which is exactly what the screen felt
 * like.
 *
 * These tests measure the arrival, by counting the rows the list actually
 * builds before the reader sees anything.
 */

const { getTranslations } = await import("@/lib/i18n");
const english = getTranslations("english");

vi.mock("@/hooks/i18n/useTranslation", () => ({
  default: () => ({
    language: "english",
    isTraditionalChinese: false,
    t: english,
  }),
}));

/*
 * The card is stood in for, and doubles as the counter.
 *
 * One render of this component is one row the list decided to build, which
 * is the whole measurement. The real card would drag in the vocabulary
 * context, the phonetics cache and the swipe gestures — none of which change
 * that number, and all of which would make a failure here ambiguous.
 */
const builtRows: string[] = [];

vi.mock("@/components/vocabulary/VocabularyCard", () => ({
  default: ({ item }: { item: VocabularyItem }) => {
    builtRows.push(item.id);

    return <div>{item.word}</div>;
  },
}));

const VocabularyList = (await import("@/components/vocabulary/VocabularyList"))
  .default;

function makeItems(count: number): VocabularyItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `word-${index}`,
    user_id: "user-1",
    word: `word ${index}`,
    translation: `translation ${index}`,
    language: "en",
    status: "learning",
    created_at: new Date(2026, 0, 1).toISOString(),
  })) as unknown as VocabularyItem[];
}

function listProps(items: VocabularyItem[]) {
  return {
    loading: false,
    totalItemCount: items.length,
    items,
    query: "",
    updatingId: null,
    expandedItemId: null,
    viewMode: "cards" as const,
    languageFilter: [] as const,
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

/**
 * Renders the list inside the app's scroll viewport, as the app does.
 *
 * The viewport is given a size by hand. jsdom lays nothing out, so every
 * element measures zero — and a zero-height scroller makes the virtualiser
 * decide that no rows are visible, which would let these tests pass against
 * a list that rendered nothing at all, forever. A phone-sized window makes
 * the counts below mean what they say.
 */
const VIEWPORT_HEIGHT = 844;
const ROW_HEIGHT = 132;

/*
 * Rows report a height too. The virtualiser measures each rendered row with
 * offsetHeight and widens its range until the window is full — with jsdom's
 * zero-height rows that never happens, and it widens until React gives up.
 */
Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
  configurable: true,
  get(this: HTMLElement) {
    return this.hasAttribute("data-index") ? ROW_HEIGHT : 0;
  },
});

function mountInsideViewport(items: VocabularyItem[]) {
  const viewport = document.createElement("div");
  viewport.setAttribute("data-app-scroll-viewport", "");

  Object.defineProperty(viewport, "offsetHeight", {
    configurable: true,
    value: VIEWPORT_HEIGHT,
  });
  Object.defineProperty(viewport, "offsetWidth", {
    configurable: true,
    value: 390,
  });

  document.body.append(viewport);

  return render(<VocabularyList {...listProps(items)} />, {
    container: viewport,
  });
}

beforeEach(() => {
  builtRows.length = 0;
  document.body.innerHTML = "";
});

describe("arriving at the vocabulary list", () => {
  it("does not build every word in the library before the first paint", () => {
    const items = makeItems(329);

    const { container } = mountInsideViewport(items);

    /*
     * 329 is a real library on this app today, and the library is meant to
     * grow into the thousands. Whatever the virtualiser decides to keep on
     * screen, arriving must not cost the whole list — a screenful and its
     * overscan is the order of magnitude, never hundreds.
     */
    expect(new Set(builtRows).size).toBeLessThan(40);

    // Nor by rendering that screenful over and over as the range settles.
    expect(builtRows.length).toBeLessThan(100);

    // And it did arrive: rows the reader can see, not an empty list.
    expect(container.querySelectorAll("[data-index]").length).toBeGreaterThan(
      0,
    );
  });

  it("builds no more rows as the library grows", () => {
    mountInsideViewport(makeItems(2000));
    const large = builtRows.length;

    builtRows.length = 0;
    document.body.innerHTML = "";

    mountInsideViewport(makeItems(50));
    const small = builtRows.length;

    // Arriving costs a screenful, not a library.
    expect(large).toBe(small);
  });

  /*
   * renderToStaticMarkup runs the render and no effects, which is precisely
   * the pass under discussion: what the component produces before it has
   * found anything to measure against.
   */
  it("puts a screenful on screen before it has measured anything", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");

    const large = renderToStaticMarkup(
      <VocabularyList {...listProps(makeItems(329))} />,
    );

    // Enough to fill a phone, and no more — not the whole library.
    expect(builtRows.length).toBe(12);
    expect(large).toContain("word 0");
    expect(large).not.toContain("word 300");

    builtRows.length = 0;

    // A short library is not padded out to twelve.
    renderToStaticMarkup(<VocabularyList {...listProps(makeItems(4))} />);
    expect(builtRows.length).toBe(4);
  });

  it("still shows every word when there is no scroller to virtualise against", () => {
    const items = makeItems(5);

    const { container } = render(<VocabularyList {...listProps(items)} />);

    expect([...new Set(builtRows)]).toEqual(items.map((item) => item.id));

    // Every word on screen, and none of it positioned against a scroller.
    for (const item of items) {
      expect(container.textContent).toContain(item.word);
    }

    expect(container.querySelectorAll("[data-index]").length).toBe(0);
  });
});
