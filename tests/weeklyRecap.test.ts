import { describe, expect, it } from "vitest";

import { buildWeekRecap } from "@/lib/recap/weekly";
import type { VocabularyItem } from "@/lib/types/app";

/*
 * The weekly recap card (Chi, 2026-11-15: 每週回顧卡): the last seven days
 * from what the reader did, with nothing estimated.
 */

const NOW = new Date(2026, 10, 15, 18, 0).getTime();
const at = (daysAgo: number) => new Date(NOW - daysAgo * 86_400_000).toISOString();
const word = (id: string, daysAgo: number) =>
  ({ id, word: id, texts: { en: id }, created_at: at(daysAgo) }) as unknown as VocabularyItem;

describe("the week's recap", () => {
  const recap = buildWeekRecap({
    items: [word("fresh", 1), word("today", 0), word("old", 40)],
    reviews: [
      { vocabulary_item_id: "old", grade: "good", created_at: at(0) },
      { vocabulary_item_id: "old", grade: "again", created_at: at(2) },
      { vocabulary_item_id: "fresh", grade: "easy", created_at: at(3) },
      { vocabulary_item_id: "old", grade: "good", created_at: at(12) },
    ],
    attempts: [{ score: 80, created_at: at(1) }, { score: 60, created_at: at(4) }, { score: null, created_at: at(4) }],
    learning: "en",
    now: NOW,
  });

  it("counts the week's words, reviews and how many were right", () => {
    expect(recap.newWords).toBe(2);
    expect(recap.totalWords).toBe(3);
    expect(recap.reviews).toBe(3);
    expect(recap.accuracy).toBe(67);
  });

  it("averages only the Lab scores that were measured", () => {
    expect(recap.labPractice).toBe(3);
    expect(recap.labScore).toBe(70);
  });

  it("counts the days with learning and the run up to today", () => {
    expect(recap.activeDays).toBe(5);
    expect(recap.streak).toBe(5);
  });

  it("names the word reviewed most", () => {
    expect(recap.topWord).toBe("old");
  });

  it("leaves accuracy empty in a week with no reviews", () => {
    expect(buildWeekRecap({ items: [], reviews: [], attempts: [], learning: "en", now: NOW }).accuracy).toBeNull();
  });
});
