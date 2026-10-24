import { describe, expect, it } from "vitest";

import { masteryProgress } from "@/lib/vocabulary/mastery";

/* A word's ring (Chi, 2026-10-24): empty when new, full when mastered, and
   in between while learning, by the slower of sm2's two conditions. */
describe("how far a word is towards mastered", () => {
  it("is empty when new and full when mastered", () => {
    expect(masteryProgress({ status: "new" })).toBe(0);
    expect(masteryProgress({ status: "mastered", review_repetitions: 2, review_interval: 3 })).toBe(1);
  });

  it("follows the slower of repetitions and interval while learning", () => {
    expect(masteryProgress({ status: "learning", review_repetitions: 4, review_interval: 10.5 })).toBeCloseTo(0.5);
    expect(masteryProgress({ status: "learning", review_repetitions: 1, review_interval: 40 })).toBeCloseTo(0.2);
  });

  it("never looks new or mastered while learning", () => {
    expect(masteryProgress({ status: "learning", review_repetitions: 0, review_interval: 0 })).toBeGreaterThan(0);
    expect(masteryProgress({ status: "learning", review_repetitions: 9, review_interval: 90 })).toBeLessThan(1);
    expect(masteryProgress({ status: "learning", review_repetitions: null, review_interval: null })).toBeGreaterThan(0);
  });
});
