import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildReviewAnalytics } from "@/lib/review/analytics";
import { calculateRetention } from "@/lib/review/sm2";
import type { VocabularyItem } from "@/lib/types/app";

const NOW = new Date("2026-09-22T12:00:00.000Z");
const DAY_MS = 86_400_000;

function daysAgo(days: number) {
  return new Date(NOW.getTime() - days * DAY_MS).toISOString();
}

function word(overrides: Partial<VocabularyItem>): VocabularyItem {
  return {
    id: "word",
    user_id: "reader",
    word: "bonjour",
    translation: "hello",
    language: "fr",
    word_language: "fr",
    translation_language: "en",
    texts: { fr: "bonjour", en: "hello" },
    examples: {},
    category: "other",
    favorite: false,
    part_of_speech: null,
    example_sentence: null,
    translated_example: null,
    image_url: null,
    confidence: null,
    status: "learning",
    created_at: daysAgo(30),
    updated_at: daysAgo(30),
    ...overrides,
  } as VocabularyItem;
}

describe("the retention curve", () => {
  /*
   * buildReviewAnalytics reads the clock itself, so the clock is the only
   * way to hold "now" still for it.
   */
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads 90% for a word reviewed exactly on schedule, whatever the interval", () => {
    for (const interval of [1, 4, 6, 15, 60]) {
      const item = word({
        review_count: 3,
        correct_count: 3,
        review_interval: interval,
        last_reviewed_at: daysAgo(interval),
      });

      expect(calculateRetention(item, NOW)).toBe(90);
    }
  });

  it("decays without falling off a cliff", () => {
    const at = (multiple: number) =>
      calculateRetention(
        word({
          review_count: 3,
          correct_count: 3,
          review_interval: 6,
          last_reviewed_at: daysAgo(6 * multiple),
        }),
        NOW,
      );

    expect(at(0)).toBe(100);
    expect(at(2)).toBe(81);
    expect(at(5)).toBe(59);
    // Long overdue is low, not annihilated — the old curve read 0% here.
    expect(at(20)).toBe(12);
  });

  /*
   * The reading that started this: 88% accuracy over a long history, and a
   * panel that answered "0%". Every word here was answered correctly and
   * none is more than a few intervals past due.
   */
  it("does not report a well-answered library as entirely forgotten", () => {
    const items = [3, 6, 10].map((interval, index) =>
      word({
        id: `word-${index}`,
        review_count: 4,
        correct_count: 4,
        review_interval: interval,
        last_reviewed_at: daysAgo(interval * 2),
      }),
    );

    const stats = buildReviewAnalytics(items);

    expect(stats.accuracy).toBe(100);
    expect(stats.retention).toBe(81);
    expect(stats.weak).toBe(0);
  });

  it("treats a word answered wrong as forgetting rather than erased", () => {
    // Failed reviews are rescheduled ten minutes out; the quarter-day floor
    // is what stops that from dividing by nothing.
    const failed = word({
      review_count: 5,
      correct_count: 3,
      review_lapses: 1,
      review_interval: 10 / 1440,
      last_reviewed_at: daysAgo(1),
    });

    expect(calculateRetention(failed, NOW)).toBe(66);
  });

  it("has nothing to say about a word never reviewed", () => {
    expect(calculateRetention(word({ status: "new" }), NOW)).toBe(100);
  });
});
