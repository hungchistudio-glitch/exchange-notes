import { describe, expect, it } from "vitest";

import { MAX_WORDS, newsItems, wordItems } from "@/lib/listen/playlist";
import type { VocabularyItem } from "@/lib/types/app";
import type { DailyNewsCard } from "@/lib/types/dailyNews";

/*
 * Listening mode (Chi, 2026-11-15: 通勤收聽模式): today's due words, each as
 * the word, its meaning and its example, then the day's news, in the
 * reader's pair.
 */

const NOW = Date.parse("2026-11-15T12:00:00Z");

const word = (id: string, due: string | null, extra: Partial<VocabularyItem> = {}): VocabularyItem => ({
  id, word: id, translation: `${id}-zh`, word_language: "en", translation_language: "zh-TW",
  texts: { en: id, "zh-TW": `${id}-zh` }, examples: { en: `I like ${id}.` }, next_review_at: due,
  ...extra,
} as unknown as VocabularyItem);

describe("listening mode's list", () => {
  it("reads due words in the order they fell due, as word, meaning, example", () => {
    const items = wordItems(
      [
        word("later", "2026-11-16T00:00:00Z"),
        word("second", "2026-11-14T00:00:00Z"),
        word("first", "2026-11-10T00:00:00Z"),
      ],
      "en",
      "zh-TW",
      NOW,
    );
    expect(items.map((item) => item.id)).toEqual(["word:first", "word:second"]);
    expect(items[0].parts).toEqual([
      { text: "first", lang: "en-US" },
      { text: "first-zh", lang: "zh-TW" },
      { text: "I like first.", lang: "en-US" },
    ]);
  });

  it("stops at a session's length", () => {
    const many = Array.from({ length: MAX_WORDS + 5 }, (_, n) => word(`w${n}`, null));
    expect(wordItems(many, "en", "zh-TW", NOW)).toHaveLength(MAX_WORDS);
  });

  it("reads each story's title and summary in the language being learned", () => {
    const card = {
      id: "a", titles: { en: "Rain returns", "zh-TW": "雨回來了" }, summaries: { en: "Farmers are glad.", "zh-TW": "農民很高興。" },
    } as unknown as DailyNewsCard;
    expect(newsItems([card], "en")[0].parts.map((part) => part.text)).toEqual(["Rain returns", "Farmers are glad."]);
  });
});
