import { describe, expect, it } from "vitest";
import { selectDiscoverBatch } from "@/lib/news/selectBatch";
import type { DailyNewsCard } from "@/lib/types/dailyNews";

const card = (id: string, category: string, sourceName = "The Guardian"): DailyNewsCard => ({
  id, category, sourceName, sourceUrl: `https://publisher.example/${id}`, itemId: `row-${id}`,
  titles: { en: id }, summaries: {}, captions: {}, vocabulary: [], imageUrl: null, publishedAt: "2026-10-05T12:00:00Z",
});
describe("Discover editorial balance", () => {
  it("gives art, technology and fashion two places each, plus general coverage", () => {
    const cards = [card("world", "World"), card("science", "Science"), card("art1", "Art", "Hyperallergic"), card("art2", "Art", "Hyperallergic"), card("art3", "Art", "ARTnews"), card("tech1", "Technology", "Ars Technica"), card("tech2", "Technology"), card("fashion1", "Fashion", "Vogue"), card("fashion2", "Fashion", "FashionUnited")];
    const batch = selectDiscoverBatch(cards);
    expect(batch.map(c => c.id)).toEqual(["art1", "tech1", "fashion1", "art3", "tech2", "fashion2", "world", "science"]);
    expect(batch[0].itemId).toBe("row-art1");
    expect(cards[0].id).toBe("world"); // selection does not mutate the pool
  });
  it("fills missing categories and publishers with available stories", () => {
    const cards = Array.from({ length: 12 }, (_, i) => card(String(i), "World"));
    expect(selectDiscoverBatch(cards)).toEqual(cards.slice(0, 8));
    expect(selectDiscoverBatch([card("art", " Art ")])).toHaveLength(1);
    expect(selectDiscoverBatch([])).toEqual([]);
  });
  it("never repeats an article even when the pool contains different row IDs", () => {
    const original = card("art", "Art");
    expect(selectDiscoverBatch([original, { ...original, itemId: "duplicate-row" }, card("other", "Art")]).map(c => c.id)).toEqual(["art", "other"]);
  });
});
