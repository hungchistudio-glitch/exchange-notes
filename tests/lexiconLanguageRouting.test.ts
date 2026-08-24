import { describe, expect, it } from "vitest";

import {
  resolveCardLanguages,
  routeQuery,
  settleLanguages,
  type LanguageRoles,
} from "@/lib/lexicon/languageRouting";
import { orientToLearner } from "@/lib/lexicon/orientation";
import type { LexiconEntry } from "@/lib/lexicon/types";
import type { LanguageCode } from "@/lib/languages";

/* =========================================================
   Which two languages a card holds, and which one leads

   Two bugs meet here and they pull in opposite directions.

   The first: the lookup schema used to allow only the reader's own two
   languages, so a French word typed by someone studying English could not
   come back as French. Not "rarely did" — could not.

   The second: everything was glossed into the support language, so a French
   learner who typed a Chinese word got a Chinese headword glossed in
   English, with no French anywhere on the card.

   Fixing either one naively breaks the other. What separates them is whether
   the reader can already read the language they typed in.
   ========================================================= */

function entry(
  termLanguage: LanguageCode,
  translationLanguage: LanguageCode,
  queryLanguage: LanguageCode = termLanguage,
): LexiconEntry {
  return {
    term: "x",
    translation: "y",
    partOfSpeech: "verb",
    termExample: "a sentence",
    translationExample: "a sentence",
    confidence: "high",
    category: "actions",
    termLanguage,
    translationLanguage,
    queryLanguage,
  };
}

describe("which two languages a card holds", () => {
  const frenchLearner: LanguageRoles = {
    learning: "fr",
    support: "en",
    native: "zh-TW",
  };

  it("leads in the language being studied when that is what was typed", () => {
    expect(resolveCardLanguages("fr", frenchLearner)).toEqual({
      headLanguage: "fr",
      glossLanguage: "en",
    });
  });

  it("answers in the language being studied when the reader could already read the question", () => {
    // Typing 爸爸 is not asking what 爸爸 means. It is asking for *papa*.
    expect(resolveCardLanguages("zh-TW", frenchLearner)).toEqual({
      headLanguage: "fr",
      glossLanguage: "en",
    });

    // Same for a word in the language they read the app in.
    expect(resolveCardLanguages("en", frenchLearner)).toEqual({
      headLanguage: "fr",
      glossLanguage: "en",
    });
  });

  it("keeps a word met in the wild in its own language", () => {
    // Studying English, standing in France. Answering with "mow" would be
    // answering a question nobody asked.
    const englishLearner: LanguageRoles = {
      learning: "en",
      support: "zh-TW",
      native: "zh-TW",
    };

    expect(resolveCardLanguages("fr", englishLearner)).toEqual({
      headLanguage: "fr",
      glossLanguage: "zh-TW",
    });
  });

  it("never puts the same language on both sides", () => {
    const codes: LanguageCode[] = ["en", "zh-TW", "es", "fr", "it"];

    for (const query of codes) {
      for (const learning of codes) {
        for (const support of codes) {
          if (learning === support) continue;

          for (const native of [...codes, null]) {
            const sides = resolveCardLanguages(query, {
              learning,
              support,
              native,
            });

            expect(sides.headLanguage).not.toBe(sides.glossLanguage);
          }
        }
      }
    }
  });
});

describe("routing a query before the dictionary answers", () => {
  const roles: LanguageRoles = { learning: "it", support: "en", native: "en" };

  it("leans on the language being studied when the spelling says nothing", () => {
    // "no" is a word in four of the five. There is nothing to go on.
    expect(routeQuery("no", roles).preferred).toBe("it");
  });

  it("lets a confident spelling overrule the setting", () => {
    expect(
      routeQuery("tondre", { learning: "en", support: "zh-TW" }).preferred,
    ).toBe("fr");
  });

  it("treats a reader's own choice as settled", () => {
    const routing = routeQuery("solo", roles, "it");

    expect(routing.preferred).toBe("it");
    expect(routing.chosen).toBe("it");
  });
});

describe("settling the languages once the dictionary has answered", () => {
  const englishLearner: LanguageRoles = {
    learning: "en",
    support: "zh-TW",
    native: "zh-TW",
  };

  it("keeps the model's answer over the reader's settings", () => {
    const routing = routeQuery("tondre", englishLearner);
    const languages = settleLanguages(routing, entry("fr", "zh-TW"));

    expect(languages.sourceLanguage).toBe("fr");
    expect(languages.glossLanguage).toBe("zh-TW");
    expect(languages.ambiguous).toBe(false);
  });

  it("separates the headword's language from the reader's own", () => {
    // 爸爸 answered as *papa*: the card is French, the question was Chinese.
    const frenchLearner: LanguageRoles = {
      learning: "fr",
      support: "en",
      native: "zh-TW",
    };

    const routing = routeQuery("爸爸", frenchLearner);
    const languages = settleLanguages(routing, entry("fr", "en", "zh-TW"));

    expect(languages.sourceLanguage).toBe("fr");
    expect(languages.queryLanguage).toBe("zh-TW");
  });

  it("asks rather than guesses when spelling and dictionary disagree strongly", () => {
    const routing = {
      ...routeQuery("falciare", englishLearner),
      detected: {
        language: "it" as LanguageCode,
        confidence: 0.95,
        candidates: ["it"] as readonly LanguageCode[],
        ambiguous: false,
      },
    };

    const languages = settleLanguages(routing, entry("es", "zh-TW"));

    expect(languages.ambiguous).toBe(true);
    expect(languages.candidates).toContain("es");
    expect(languages.candidates).toContain("it");
  });

  it("treats a reader's choice as certain and unquestioned", () => {
    const routing = routeQuery("solo", { learning: "fr", support: "en" }, "it");
    const languages = settleLanguages(routing, entry("it", "en", "it"));

    expect(languages.queryLanguage).toBe("it");
    expect(languages.confidence).toBe(1);
    expect(languages.ambiguous).toBe(false);
    expect(languages.chosen).toBe(true);
  });

  it("keeps the reader's own text as the headword when nothing answered", () => {
    // Offline. There is no French word to promote the card to, so promising
    // one would be inventing it.
    const routing = routeQuery("tondre", { learning: "it", support: "en" });
    const languages = settleLanguages(routing, null);

    expect(languages.sourceLanguage).toBe("fr");
    expect(languages.glossLanguage).not.toBe("fr");
  });
});

describe("turning a result the right way round", () => {
  it("moves the language being studied onto the headword side", () => {
    const languages = {
      sourceLanguage: "en" as LanguageCode,
      queryLanguage: "en" as LanguageCode,
      glossLanguage: "fr" as LanguageCode,
      confidence: 0.9,
      ambiguous: false,
      candidates: ["en"] as readonly LanguageCode[],
      chosen: false,
    };

    const oriented = orientToLearner(
      { ...entry("en", "fr"), term: "mow", translation: "tondre" },
      languages,
      "fr",
    );

    expect(oriented?.entry.term).toBe("tondre");
    expect(oriented?.entry.translation).toBe("mow");
    expect(oriented?.languages.sourceLanguage).toBe("fr");
    // The correction control still points at what the reader typed.
    expect(oriented?.languages.queryLanguage).toBe("en");
  });

  it("leaves a result that is already the right way round alone", () => {
    const languages = {
      sourceLanguage: "fr" as LanguageCode,
      queryLanguage: "fr" as LanguageCode,
      glossLanguage: "zh-TW" as LanguageCode,
      confidence: 0.9,
      ambiguous: false,
      candidates: ["fr"] as readonly LanguageCode[],
      chosen: false,
    };

    const input = { ...entry("fr", "zh-TW"), term: "tondre" };
    const oriented = orientToLearner(input, languages, "en");

    expect(oriented?.entry).toBe(input);
  });
});

describe("a correction survives a failed attempt", () => {
  /*
   * The pin a retry repeats is the language of what the reader typed, not the
   * language of the headword they were handed. Those diverge exactly when the
   * result was turned to put the language being studied first — and that is
   * also when re-pinning the headword would silently drop the correction the
   * reader had just made.
   */
  it("keeps the two anchors apart after the result is turned round", () => {
    const languages = {
      sourceLanguage: "en" as LanguageCode,
      queryLanguage: "en" as LanguageCode,
      glossLanguage: "fr" as LanguageCode,
      confidence: 1,
      ambiguous: false,
      candidates: ["en"] as readonly LanguageCode[],
      chosen: true,
    };

    const oriented = orientToLearner(entry("en", "fr"), languages, "fr");

    expect(oriented?.languages.sourceLanguage).toBe("fr");
    // What a retry must re-pin, and what the picker must highlight.
    expect(oriented?.languages.queryLanguage).toBe("en");
    expect(oriented?.languages.chosen).toBe(true);
  });
});

describe("the language matrix", () => {
  /*
   * Straight from the brief. Each row is a reader, a word they met in a
   * language they cannot read, and the language that word has to keep.
   */
  const rows: Array<{
    roles: LanguageRoles;
    query: string;
    reported: LanguageCode;
  }> = [
    { roles: { learning: "fr", support: "en" }, query: "tondre", reported: "fr" },
    {
      roles: { learning: "fr", support: "zh-TW" },
      query: "tondre",
      reported: "fr",
    },
    { roles: { learning: "en", support: "es" }, query: "mow", reported: "en" },
    {
      roles: { learning: "it", support: "fr" },
      query: "falciare",
      reported: "it",
    },
    {
      roles: { learning: "zh-TW", support: "it" },
      query: "修剪",
      reported: "zh-TW",
    },
    // The one that used to be impossible: studying English, met in France.
    {
      roles: { learning: "en", support: "zh-TW", native: "zh-TW" },
      query: "tondre",
      reported: "fr",
    },
  ];

  for (const row of rows) {
    it(`keeps ${row.query} as ${row.reported} while learning ${row.roles.learning}`, () => {
      const routing = routeQuery(row.query, row.roles);
      const sides = resolveCardLanguages(row.reported, row.roles);

      const languages = settleLanguages(
        routing,
        entry(sides.headLanguage, sides.glossLanguage, row.reported),
      );

      expect(languages.queryLanguage).toBe(row.reported);
      expect(languages.sourceLanguage).not.toBe(languages.glossLanguage);
    });
  }
});
