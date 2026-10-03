import { describe, expect, it, vi } from "vitest";

/* =========================================================
   The built-in five-language dictionary (Chi, 2026-09-28)

   When every model is busy and the basic translation service is out too,
   a typed word in any of the app's five languages should still get a card.
   These pin the data's shape, how a word is matched the way a reader types
   it, and that the offline lookup answers from it without asking anyone.
   ========================================================= */

import {
  CORE_LEXICON_SIZE,
  coreWordEntry,
  findCoreWord,
  findCoreWordIn,
} from "@/lib/vocabulary/coreLexicon";
import { CORE_LEXICON_SOURCE } from "@/lib/vocabulary/coreLexiconData";
import { lookupOffline } from "@/lib/vocabulary/offlineLookup";

describe("the data", () => {
  const lines = CORE_LEXICON_SOURCE.split("\n").filter((line) => line.trim());

  it("holds every line it was written with", () => {
    expect(CORE_LEXICON_SIZE).toBe(lines.length);
    expect(CORE_LEXICON_SIZE).toBeGreaterThan(4_000);
  });

  it("has every entry in all five languages, with no empty form", () => {
    for (const line of lines) {
      const fields = line.split("|");
      expect(fields, line).toHaveLength(7);
      for (const field of fields.slice(2)) {
        for (const form of field.split(";")) {
          expect(form.trim(), line).not.toBe("");
          expect(form, line).toBe(form.trim());
        }
      }
    }
  });

  it("writes Chinese the way Taiwan does, not the Mainland's everyday words", () => {
    const chinese = lines.map((line) => line.split("|")[3]).join(";");

    for (const mainland of ["自行車", "出租車", "視頻", "軟件", "土豆", "信息"]) {
      expect(chinese.split(";"), mainland).not.toContain(mainland);
    }
  });
});

describe("matching what was typed", () => {
  it("finds a word in each of the five languages", () => {
    expect(findCoreWord("thank you", "en")?.forms["zh-TW"][0]).toBe("謝謝");
    expect(findCoreWord("謝謝", "zh-TW")?.forms.fr[0]).toBe("merci");
    expect(findCoreWord("gracias", "es")?.forms.it[0]).toBe("grazie");
    expect(findCoreWord("merci", "fr")?.forms.en[0]).toBe("thank you");
    expect(findCoreWord("grazie", "it")?.forms.es[0]).toBe("gracias");
  });

  it("ignores case, spacing and trailing punctuation", () => {
    expect(findCoreWord("  Merci ! ", "fr")?.forms.en[0]).toBe("thank you");
    expect(findCoreWord("¿Gracias?", "es")?.forms.en[0]).toBe("thank you");
  });

  it("looks past a leading article, an elision, or English 'to'", () => {
    expect(findCoreWord("la maison", "fr")?.forms.en[0]).toBe("house");
    expect(findCoreWord("l'eau", "fr")?.forms.en[0]).toBe("water");
    expect(findCoreWord("L’eau", "fr")?.forms.en[0]).toBe("water");
    expect(findCoreWord("to eat", "en")?.forms.fr[0]).toBe("manger");
  });

  it("prefers an entry whose own form carries the article", () => {
    // "to go" is the takeaway phrase; "go" is still the verb.
    expect(findCoreWord("to go", "en")?.forms["zh-TW"][0]).toBe("外帶");
    expect(findCoreWord("go", "en")?.partOfSpeech).toBe("verb");
  });

  it("forgives missing accents, after every exact match", () => {
    expect(findCoreWord("cafe", "en")?.forms["zh-TW"][0]).toBe("咖啡廳");
    expect(findCoreWord("felicita", "it")?.forms.en[0]).toBe("happiness");
  });

  it("recognises a feminine form and shows the masculine", () => {
    const tired = findCoreWord("cansada", "es");
    expect(tired?.forms.en[0]).toBe("tired");
    expect(tired?.forms.es[0]).toBe("cansado");
  });

  it("gives the everyday sense first when a spelling has two", () => {
    expect(findCoreWord("cold", "en")?.forms["zh-TW"][0]).toBe("冷");
    expect(findCoreWord("rain", "en")?.forms["zh-TW"][0]).toBe("雨");
  });

  /* Real lookups that came back empty on 2026-10-01: "shoes", "navi", "fuerzas". */
  it("finds the dictionary form of a plural", () => {
    expect(findCoreWord("ciudades", "es")?.forms.en[0]).toBe("city");
    expect(findCoreWord("animaux", "fr")?.forms.en[0]).toBe("animal");
    expect(findCoreWord("fiori", "it")?.forms.en[0]).toBe("flower");
    expect(findCoreWord("cities", "en")?.forms.en[0]).toBe("city");
  });

  it("still prefers a word typed exactly as the dictionary has it", () => {
    expect(findCoreWord("news", "en")?.forms.en[0]).toBe("news");
  });

  it("knows which language a guessed word turned out to be", () => {
    expect(findCoreWordIn("grazie", ["en", "it"])?.language).toBe("it");
    expect(findCoreWordIn("qwertyuiop", ["en", "fr"])).toBeNull();
  });
});

describe("the card", () => {
  it("is a basic translation, with no invented example", () => {
    const word = findCoreWord("merci", "fr")!;

    expect(coreWordEntry(word, "fr", "zh-TW")).toMatchObject({
      term: "merci",
      translation: "謝謝",
      termLanguage: "fr",
      translationLanguage: "zh-TW",
      termExample: "",
      translationExample: "",
      basicTranslation: true,
      kind: "phrase",
    });
  });
});

describe("the offline lookup, with every model busy", () => {
  const french = { learning: "fr", support: "zh-TW", native: "zh-TW" } as const;
  const italian = { learning: "it", support: "en", native: "en" } as const;

  it("answers a French word in Chinese without asking anyone", async () => {
    const translate = vi.fn();

    const entry = await lookupOffline("bonjour", { source: "fr", roles: french }, translate);

    expect(translate).not.toHaveBeenCalled();
    expect(entry).toMatchObject({
      term: "bonjour",
      termLanguage: "fr",
      translationLanguage: "zh-TW",
      basicTranslation: true,
    });
    expect(entry.translation).not.toBe("");
    expect(entry.translationUnavailable).toBeFalsy();
  });

  it("gives a French headword for a word typed in Chinese, as the card rule asks", async () => {
    const entry = await lookupOffline("謝謝", { source: "zh-TW", roles: french }, vi.fn());

    expect(entry).toMatchObject({
      term: "merci",
      translation: "謝謝",
      termLanguage: "fr",
      translationLanguage: "zh-TW",
    });
  });

  it("answers Italian for an English speaker, which CC-CEDICT never could", async () => {
    const entry = await lookupOffline("grazie", { source: "it", roles: italian }, vi.fn());

    expect(entry).toMatchObject({
      term: "grazie",
      translation: "thank you",
      termLanguage: "it",
      translationLanguage: "en",
    });
  });

  it("answers a plural of a camera word from the object dictionary", async () => {
    const entry = await lookupOffline("navi", { source: "it", roles: italian }, vi.fn());

    expect(entry).toMatchObject({ term: "nave", termLanguage: "it" });
    expect(entry.translationUnavailable).toBeFalsy();
  });

  it("finds the word in the reader's own language when the guess was wrong", async () => {
    // No confident detection: the lookup tries the guess, then the reader's languages.
    const entry = await lookupOffline("grazie", { roles: italian }, vi.fn());

    expect(entry.term).toBe("grazie");
    expect(entry.translation).toBe("thank you");
  });
});
