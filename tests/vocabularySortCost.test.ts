import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import useVisibleVocabularyItems from "@/hooks/useVisibleVocabularyItems";
import { recordInteractions } from "@/lib/vocabulary/helpers";
import type { VocabularyItem } from "@/lib/types/app";

/* =========================================================
   The interaction map is read once per sort, not once per comparison

   The relevance sort's fallback — the branch that runs while the AI ranking
   is still loading, when it errors, and offline — read the whole interaction
   map inside its comparator. A comparator runs O(n log n) times: 400 words is
   about 2,800 comparisons, and each one pulled 62KB out of localStorage and
   parsed it.

   Measured in a browser at 400 words: 687ms of blocked main thread for one
   sort, against 1.5ms for the same sort reading the map once. It is the
   branch that runs on arrival at the screen, which is when the reader is most
   likely to be touching it, and a main thread blocked that long does not
   stutter — it drops taps entirely.

   The cost is invisible to a correctness test, so this counts the reads.
   ========================================================= */

const WORDS = 300;

function library(): VocabularyItem[] {
  return Array.from({ length: WORDS }, (_, index) => ({
    id: `w${index}`,
    user_id: "u",
    word: `word${index}`,
    translation: `翻譯${index}`,
    language: "en",
    word_language: "en",
    translation_language: "zh-TW",
    texts: {},
    examples: {},
    category: "other",
    favorite: false,
    part_of_speech: null,
    example_sentence: null,
    translated_example: null,
    image_url: null,
    confidence: null,
    status: (["learning", "new", "mastered"] as const)[index % 3],
    created_at: new Date(Date.UTC(2026, 0, 1) + index * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  })) as unknown as VocabularyItem[];
}

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("sorting a library by relevance", () => {
  it("reads the interaction map once, however many words there are", () => {
    const items = library();

    /* A map with something in it, so the fallback branch has work to weigh. */
    recordInteractions(items.slice(0, 50), "search");

    const reads = vi.spyOn(Storage.prototype, "getItem");

    renderHook(() =>
      useVisibleVocabularyItems({
        items,
        query: "",
        quickFilter: "all",
        languages: [],
        sortMode: "relevance",
        /* Empty, which is the state this branch exists for: no ranking yet. */
        rankedIds: [],
      }),
    );

    const interactionReads = reads.mock.calls.filter(
      ([key]) => key === "vocabulary-interactions-v1",
    ).length;

    /*
     * One read for the sort. Asserting a small ceiling rather than exactly
     * one, so an unrelated read elsewhere in the hook does not fail this —
     * the regression being caught is thousands, not two.
     */
    expect(interactionReads).toBeLessThanOrEqual(2);
  });
});
