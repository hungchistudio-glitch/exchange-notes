import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  readInteractionMap,
  recordInteraction,
  recordInteractions,
} from "@/lib/vocabulary/helpers";
import type { VocabularyItem } from "@/lib/types/app";

/* =========================================================
   One write, not one per word

   recordInteraction re-reads and re-serialises the whole interaction map on
   every call. That is fine for a tap and ruinous in a loop, and it was in a
   loop twice: once per card on mount, and once per matching word every time
   a search settled. Measured against a 388-word library, the first of those
   blocked the main thread for 439ms and put about 45MB of JSON through
   parse and stringify — and it grew with the square of the library, so it
   was worst for the readers with the most words.

   The mount counter is gone (it counted every word equally every time the
   list opened, so it was noise inside a relevance sort). The search one had
   to keep recording exactly what it recorded before, so it batches instead.
   These tests hold that line: same data, one write.
   ========================================================= */

function word(id: string): VocabularyItem {
  return {
    id,
    word: `word-${id}`,
    translation: `翻譯-${id}`,
  } as VocabularyItem;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("recording one interaction", () => {
  it("counts it, and remembers the word it was for", () => {
    recordInteraction(word("a"), "search");

    expect(readInteractionMap()["a"]).toMatchObject({
      word: "word-a",
      translation: "翻譯-a",
      search: 1,
      view: 0,
    });
  });

  it("adds to what is already there", () => {
    recordInteraction(word("a"), "search");
    recordInteraction(word("a"), "search");
    recordInteraction(word("a"), "speak");

    expect(readInteractionMap()["a"]).toMatchObject({ search: 2, speak: 1 });
  });
});

describe("recording a batch", () => {
  it("writes once however many words there are", () => {
    /*
     * The whole point. One call per word meant one full read, parse,
     * stringify and write per word — hundreds of them on a single keystroke
     * pause against a large library.
     */
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    recordInteractions(
      Array.from({ length: 200 }, (_, i) => word(`w${i}`)),
      "search",
    );

    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it("records exactly what a loop of single calls would have", () => {
    // A change of cost, not of meaning — so this compares the two directly.
    const items = [word("a"), word("b"), word("c")];

    items.forEach((item) => recordInteraction(item, "search"));
    const oneAtATime = readInteractionMap();

    window.localStorage.clear();
    recordInteractions(items, "search");
    const batched = readInteractionMap();

    for (const id of ["a", "b", "c"]) {
      expect(batched[id].search).toBe(oneAtATime[id].search);
      expect(batched[id].word).toBe(oneAtATime[id].word);
      expect(batched[id].translation).toBe(oneAtATime[id].translation);
    }
  });

  it("adds to counts that were already there", () => {
    recordInteraction(word("a"), "search");
    recordInteractions([word("a"), word("b")], "search");

    const map = readInteractionMap();

    expect(map["a"].search).toBe(2);
    expect(map["b"].search).toBe(1);
  });

  it("writes nothing at all for an empty batch", () => {
    // A search that matched no words must not rewrite the map to say so.
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    recordInteractions([], "search");

    expect(setItem).not.toHaveBeenCalled();
  });

  it("leaves words it was not given alone", () => {
    recordInteraction(word("untouched"), "speak");
    recordInteractions([word("a")], "search");

    expect(readInteractionMap()["untouched"]).toMatchObject({ speak: 1 });
  });
});
