import { describe, expect, it } from "vitest";

import type { VocabularyItem } from "@/lib/types/app";
import { buildStarMap, MAX_STARS } from "@/lib/vocabulary/starMap";

/*
 * The library as a star chart (Chi, 2026-11-15: 單字星圖): a collection is
 * a constellation, the rest gather by kind, shared roots are joined across
 * the sky, and the same library always draws the same sky.
 */

const word = (id: string, extra: Partial<VocabularyItem> = {}) => ({
  id, word: id, texts: { en: id }, status: "learning", category: "objects",
  created_at: `2026-11-${String(10 + (id.length % 5)).padStart(2, "0")}T00:00:00Z`, ...extra,
}) as unknown as VocabularyItem;

const names = { people: "People", objects: "Things", actions: "Actions", other: "Other" };

describe("the star map", () => {
  const items = [
    word("coordinate"), word("coordination", { category: "actions" }), word("apple"), word("pear"), word("teacher", { category: "people" }),
  ];
  const map = buildStarMap(items, "en", {
    collections: [{ key: "fruit", name: "Fruit", emoji: "🍎", itemIds: ["apple", "pear"] }],
    categoryNames: names,
  });

  it("makes a collection one constellation and gathers the rest by kind", () => {
    expect(map.constellations.map((c) => c.name).sort()).toEqual(["Actions", "Fruit", "People", "Things"]);
    expect(map.stars.filter((star) => star.group === map.stars.find((s) => s.id === "apple")!.group).map((s) => s.id).sort())
      .toEqual(["apple", "pear"]);
  });

  it("joins words that share a root, across constellations", () => {
    expect(map.lines).toContainEqual(expect.objectContaining({ root: true }));
    const root = map.lines.find((line) => line.root)!;
    expect([root.from, root.to].sort()).toEqual(["coordinate", "coordination"]);
  });

  it("draws the same sky every time, inside its own bounds", () => {
    const again = buildStarMap(items, "en", {
      collections: [{ key: "fruit", name: "Fruit", itemIds: ["apple", "pear"] }],
      categoryNames: names,
    });
    expect(again.stars.map((s) => [s.id, Math.round(s.x), Math.round(s.y)])).toEqual(map.stars.map((s) => [s.id, Math.round(s.x), Math.round(s.y)]));
    expect(map.stars.every((s) => s.x >= 0 && s.y >= 0 && s.x <= map.width && s.y <= map.height)).toBe(true);
  });

  it("keeps the newest words when the library outgrows the sky", () => {
    const many = Array.from({ length: MAX_STARS + 20 }, (_, n) => word(`w${n}`, { created_at: new Date(Date.UTC(2026, 0, 1) + n * 60_000).toISOString() }));
    const big = buildStarMap(many, "en", { collections: [], categoryNames: names });
    expect(big.stars).toHaveLength(MAX_STARS);
    expect(big.stars.some((s) => s.id === `w${MAX_STARS + 19}`)).toBe(true);
    expect(big.stars.some((s) => s.id === "w0")).toBe(false);
  });
});
