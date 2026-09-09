import { describe, expect, it } from "vitest";

import { findDuplicate, searchPersonal } from "@/lib/lexicon/personal";
import { draftVocabularyItem } from "@/lib/offline/vocabulary";
import type { LanguageCode } from "@/lib/languages";
import type { VocabularyItem } from "@/lib/types/app";

/* =========================================================
   Layer one: the words the reader already has

   Shown before anything is asked of a model, and separately from what the
   dictionary says — "you saved this in March" is a different and better
   answer than "here is what it means", and merging the two into one ranked
   list loses the only part the reader could not have got elsewhere.
   ========================================================= */

function word(
  id: string,
  texts: Partial<Record<LanguageCode, string>>,
  wordLanguage: LanguageCode,
): VocabularyItem {
  const translationLanguage = (Object.keys(texts) as LanguageCode[]).find(
    (code) => code !== wordLanguage,
  );

  return draftVocabularyItem({
    id,
    user_id: "u",
    texts,
    word: texts[wordLanguage] ?? "",
    translation: translationLanguage ? (texts[translationLanguage] ?? "") : "",
    word_language: wordLanguage,
    translation_language: translationLanguage ?? "en",
    created_at: `2026-08-${id.padStart(2, "0")}T00:00:00Z`,
  } as never);
}

const library = [
  word("01", { fr: "tondre", "zh-TW": "割草" }, "fr"),
  word("02", { en: "mow", "zh-TW": "割草" }, "en"),
  word("03", { fr: "été", en: "summer" }, "fr"),
  word("04", { it: "come", en: "how" }, "it"),
];

describe("finding the reader's own words", () => {
  it("matches in any language the word is held in", () => {
    expect(searchPersonal(library, "tondre")[0].id).toBe("01");
    expect(searchPersonal(library, "割草").map((item) => item.id)).toContain(
      "01",
    );
  });

  it("forgives a missing accent", () => {
    // The reader whose keyboard makes "été" awkward still finds it.
    expect(searchPersonal(library, "ete")[0].id).toBe("03");
  });

  it("puts an exact match ahead of a prefix one", () => {
    const results = searchPersonal(library, "mow");
    expect(results[0].id).toBe("02");
  });

  it("answers nothing for an empty query rather than everything", () => {
    expect(searchPersonal(library, "   ")).toEqual([]);
  });
});

describe("deciding whether a word is already saved", () => {
  it("catches the same word typed in a different case", () => {
    expect(findDuplicate(library, "MOW", "en")?.id).toBe("02");
  });

  it("does not call the same spelling in another language a duplicate", () => {
    // "come" is Italian in this library. An English "come" is a different
    // word with a different meaning and deserves its own card.
    expect(findDuplicate(library, "come", "en")).toBeNull();
    expect(findDuplicate(library, "come", "it")?.id).toBe("04");
  });

  it("does not fold an accent away", () => {
    // "ete" is not a French word; "été" is. Treating them as the same entry
    // would refuse to save whichever came second.
    expect(findDuplicate(library, "ete", "fr")).toBeNull();
    expect(findDuplicate(library, "été", "fr")?.id).toBe("03");
  });

  it("catches a word held as the gloss of an existing row", () => {
    // Row 03 is "été" glossed "summer". Saving "summer" as an English card
    // would give the reader the same fact twice.
    expect(findDuplicate(library, "summer", "en")?.id).toBe("03");
  });

  it("treats an empty term as nothing to match", () => {
    expect(findDuplicate(library, "   ", "en")).toBeNull();
  });
});
