import { renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import type { VocabularyItem } from "@/lib/types/app";

/*
 * Home and Review counted every saved card; the library folded cards with the
 * same word and translation into one. The same account read 510 words on Home
 * and 496 in the library. Two cards with the same text are two cards the
 * reader saved, so every page counts — and the library lists — all of them.
 */

function card(id: string, word: string, translation: string, status: string): VocabularyItem {
  return {
    id,
    word,
    translation,
    word_language: "en",
    translation_language: "zh-TW",
    status,
    created_at: new Date().toISOString(),
  } as unknown as VocabularyItem;
}

const ITEMS = [
  card("a", "glasses", "眼鏡", "new"),
  card("b", "Glasses", "眼鏡", "learning"),
  card("c", "cup", "杯子", "mastered"),
];

vi.mock("@/hooks/useVocabulary", () => ({
  default: () => ({ items: ITEMS, setItems: vi.fn(), setError: vi.fn(), loading: false, error: "" }),
}));
vi.mock("@/hooks/useVocabularyFriendPicker", () => ({ default: () => ({}) }));
vi.mock("@/hooks/useVocabularyMutations", () => ({ default: () => ({}) }));
vi.mock("@/hooks/i18n/useTranslation", () => ({
  default: () => ({
    t: { vocabulary: { search: { statuses: { all: "All", new: "New", learning: "Learning", mastered: "Mastered" } } } },
  }),
}));
vi.mock("@/hooks/preferences/useDailyGoalWords", () => ({ default: () => 10 }));

it("lists and counts every saved card, including two with the same text", async () => {
  const { default: useVocabularyController } = await import(
    "@/hooks/controllers/useVocabularyController"
  );
  const { result } = renderHook(() => useVocabularyController());

  expect(result.current.alphabetizedItems).toHaveLength(3);
  expect(result.current.stats.totalWords).toBe(3);
  expect(result.current.stats.languageCounts.get("en")).toBe(3);
  expect(result.current.stats.quickFilters.map((filter) => filter.count)).toEqual([3, 1, 1, 1]);
});
