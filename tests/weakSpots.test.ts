import { describe, expect, it } from "vitest";

import type { ProgressByUnit } from "@/lib/pronunciation/lab/types";
import { skillAxes, weakSounds, weakWords, weakestAxis } from "@/lib/review/weakSpots";
import type { VocabularyItem } from "@/lib/types/app";

/*
 * The weak-spot radar (Chi, 2026-11-15: 弱點雷達): five measures read from
 * what the reader has done, null where nothing measures one yet, and the
 * words and sounds behind the low ones.
 */

const NOW = Date.parse("2026-11-15T12:00:00Z");
const word = (id: string, extra: Partial<VocabularyItem> & { last_review_grade?: string }) => ({
  id, word: id, created_at: "2026-10-01T00:00:00Z", review_count: 0, correct_count: 0, ...extra,
}) as unknown as VocabularyItem;

describe("the weak-spot radar", () => {
  it("measures recall from every answer, and leaves the Lab's axes empty until it is used", () => {
    const axes = skillAxes(
      [word("a", { review_count: 4, correct_count: 3 }), word("b", { review_count: 4, correct_count: 1 })],
      null,
      NOW,
    );
    expect(axes.find((axis) => axis.id === "recall")?.value).toBe(50);
    expect(axes.find((axis) => axis.id === "listening")?.value).toBeNull();
    expect(weakestAxis(axes)?.id).toBe("growth");
  });

  it("names the words that keep slipping, never one that was only never reviewed", () => {
    const weak = weakWords(
      [
        word("new", { review_count: 0 }),
        word("solid", { review_count: 5, correct_count: 5 }),
        word("slippery", { review_count: 6, correct_count: 2, review_lapses: 3, last_review_grade: "again" }),
      ],
      NOW,
    );
    expect(weak.map((item) => item.id)).toEqual(["slippery"]);
  });

  it("puts the lowest-scoring practised sounds first, and leaves mastered ones out", () => {
    const progress = {
      a: { unitId: "a", attempts: 3, listeningScore: 80, speakingScore: 40, mastery: "learning" },
      b: { unitId: "b", attempts: 2, listeningScore: 20, mastery: "learning" },
      c: { unitId: "c", attempts: 5, listeningScore: 10, mastery: "mastered" },
      d: { unitId: "d", attempts: 0, mastery: "new" },
    } as unknown as ProgressByUnit;
    expect(weakSounds(progress).map((sound) => sound.unitId)).toEqual(["b", "a"]);
  });
});
