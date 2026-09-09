import { describe, expect, it } from "vitest";

import { getPronunciationPack } from "@/lib/pronunciation/lab/registry";
import {
  countWordsInLanguage,
  selectPronunciationWords,
  spellingsForUnit,
  textInLanguage,
  unitsForWord,
} from "@/lib/pronunciation/lab/words";
import { findUnit } from "@/lib/pronunciation/lab/registry";
import type { VocabularyItem } from "@/lib/types/app";

const spanish = getPronunciationPack("es");
const chinese = getPronunciationPack("zh-TW");

const now = new Date("2026-08-22T09:00:00Z");

function vocabularyItem(overrides: Partial<VocabularyItem>): VocabularyItem {
  return {
    id: "item",
    user_id: "user",
    word: "perro",
    translation: "dog",
    language: "es",
    word_language: "es",
    translation_language: "en",
    texts: { es: "perro", en: "dog" },
    examples: {},
    category: "other",
    favorite: false,
    part_of_speech: null,
    example_sentence: null,
    translated_example: null,
    image_url: null,
    confidence: null,
    status: "learning",
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("spellingsForUnit", () => {
  it("derives spellings from the unit rather than a second hand-written list", () => {
    const rr = findUnit(spanish, "rr")!;
    expect(spellingsForUnit(rr)).toContain("rr");
  });

  it("splits a unit that carries two spellings of one sound", () => {
    const llY = findUnit(spanish, "ll-y")!;
    const spellings = spellingsForUnit(llY);

    expect(spellings).toContain("ll");
    expect(spellings).toContain("y");
  });

  it("puts longer spellings first so rr wins over r", () => {
    const spellings = spellingsForUnit(findUnit(spanish, "rr")!);
    const lengths = spellings.map((spelling) => spelling.length);

    expect(lengths).toEqual([...lengths].sort((a, b) => b - a));
  });
});

describe("unitsForWord", () => {
  it("finds the sounds a Spanish word actually drills", () => {
    expect(unitsForWord(spanish, "perro")).toContain("rr");
    expect(unitsForWord(spanish, "mañana")).toContain("n-tilde");
    expect(unitsForWord(spanish, "trabajo")).toContain("j");
  });

  it("does not match every word to a single letter", () => {
    // A grapheme unit named after one letter would otherwise match nearly
    // every word, which is noise rather than a signal about what to practise.
    const units = unitsForWord(spanish, "casa");
    expect(units).not.toContain("h");
  });

  it("matches Chinese through the phonetic spelling, not the characters", () => {
    // The units are zhuyin and the word is Hanzi, so there is nothing to
    // match until the zhuyin is computed and passed in.
    expect(unitsForWord(chinese, "飛機")).toEqual([]);
    expect(unitsForWord(chinese, "飛機", "ㄈㄟ ㄐㄧ")).toContain("zhuyin-f");
  });

  it("returns nothing rather than a guess", () => {
    expect(unitsForWord(spanish, "")).toEqual([]);
  });
});

describe("textInLanguage", () => {
  it("prefers the multilingual field", () => {
    const item = vocabularyItem({ texts: { es: "perro", en: "dog" } });
    expect(textInLanguage(item, "es")).toBe("perro");
    expect(textInLanguage(item, "en")).toBe("dog");
  });

  it("falls back to the legacy pair", () => {
    const item = vocabularyItem({ texts: {} });
    expect(textInLanguage(item, "es")).toBe("perro");
    expect(textInLanguage(item, "en")).toBe("dog");
  });

  it("is null for a language the row simply does not have", () => {
    expect(textInLanguage(vocabularyItem({}), "fr")).toBeNull();
  });
});

describe("selectPronunciationWords", () => {
  it("puts a word containing a weak sound before a word added this morning", () => {
    const weakProgress = {
      rr: {
        language: "es" as const,
        unitId: "rr",
        attempts: 10,
        correctAttempts: 1,
        mastery: "learning" as const,
      },
    };

    const targets = selectPronunciationWords(
      spanish,
      [
        vocabularyItem({
          id: "fresh",
          word: "casa",
          texts: { es: "casa" },
          status: "new",
          created_at: now.toISOString(),
        }),
        vocabularyItem({ id: "weak", word: "perro", texts: { es: "perro" } }),
      ],
      weakProgress,
      { now },
    );

    expect(targets[0].itemId).toBe("weak");
    expect(targets[0].reason).toBe("weak");
  });

  it("skips words that are not in this language at all", () => {
    const targets = selectPronunciationWords(
      spanish,
      [vocabularyItem({ texts: { fr: "chien" }, word_language: "fr", translation_language: "en" })],
      {},
      { now },
    );

    expect(targets).toEqual([]);
  });

  it("picks up a word the learner keeps getting wrong", () => {
    const targets = selectPronunciationWords(
      spanish,
      [
        vocabularyItem({
          id: "lapsed",
          texts: { es: "casa" },
          status: "learning",
          review_lapses: 3,
          created_at: "2026-01-01T00:00:00Z",
        }),
      ],
      {},
      { now },
    );

    expect(targets[0].reason).toBe("difficult");
  });

  it("honours its limit", () => {
    const items = Array.from({ length: 30 }, (_, index) =>
      vocabularyItem({ id: `item-${index}`, texts: { es: "perro" }, status: "new" }),
    );

    expect(selectPronunciationWords(spanish, items, {}, { now, limit: 5 })).toHaveLength(5);
  });
});

describe("countWordsInLanguage", () => {
  it("separates 'no vocabulary here' from 'nothing needs practice'", () => {
    const items = [
      vocabularyItem({ texts: { es: "perro" } }),
      vocabularyItem({ id: "b", texts: { fr: "chien" }, word_language: "fr" }),
    ];

    expect(countWordsInLanguage(items, "es")).toBe(1);
    expect(countWordsInLanguage(items, "it")).toBe(0);
  });
});
