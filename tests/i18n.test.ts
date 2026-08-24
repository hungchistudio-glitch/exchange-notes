import { describe, expect, it } from "vitest";

import english from "@/lib/i18n/en";
import french from "@/lib/i18n/fr";
import italian from "@/lib/i18n/it";
import spanish from "@/lib/i18n/es";
import traditionalChinese from "@/lib/i18n/zh-TW";
import { getTranslations } from "@/lib/i18n";
import { getInterfaceLanguages } from "@/lib/languages";
import type { TranslationLanguage } from "@/lib/i18n/types";

/* =========================================================
   The five dictionaries, checked against each other

   TypeScript already guarantees every key exists — TranslationDictionary is
   a complete type. What it cannot see is what is *inside* the strings: a
   placeholder dropped in translation produces a sentence with a hole in it,
   and a string left in English produces a screen that is half translated.
   ========================================================= */

const DICTIONARIES: Record<TranslationLanguage, unknown> = {
  english,
  "traditional-chinese": traditionalChinese,
  spanish,
  french,
  italian,
};

function flatten(value: unknown, prefix = "", out: Record<string, string> = {}) {
  if (typeof value === "string") {
    out[prefix] = value;
    return out;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
  }
  return out;
}

const flatEnglish = flatten(english);

/**
 * Strings that are correctly empty in one language.
 *
 * An allowlist rather than a relaxed assertion, so a *new* empty string
 * still fails and each exception has to say why it is one.
 *
 * zh-TW's `inCollection` renders after a count — "3 個單字 …" — and Chinese
 * does not need the trailing "in this collection" that English needs to
 * finish the sentence.
 */
const DELIBERATELY_EMPTY = new Set([
  "traditional-chinese.vocabulary.collections.detail.inCollection",
]);

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

describe("translation dictionaries", () => {
  for (const [language, dictionary] of Object.entries(DICTIONARIES)) {
    describe(language, () => {
      const flat = flatten(dictionary);

      it("has exactly the same keys as English", () => {
        expect(Object.keys(flat).sort()).toEqual(Object.keys(flatEnglish).sort());
      });

      it("carries every placeholder its English original does", () => {
        // A translator who drops {count} leaves a sentence with a hole in it,
        // and one who invents {name} leaves a literal "{name}" on screen.
        for (const [key, source] of Object.entries(flatEnglish)) {
          expect(placeholders(flat[key]), `${key}`).toEqual(placeholders(source));
        }
      });

      it("has no accidentally empty strings", () => {
        for (const [key, value] of Object.entries(flat)) {
          if (DELIBERATELY_EMPTY.has(`${language}.${key}`)) continue;
          expect(value.trim().length, `${key}`).toBeGreaterThan(0);
        }
      });
    });
  }

  it("describes every interface language in every interface language", () => {
    // The picker used to fall through an if-chain to the English line, so a
    // newly shipped language described itself as English.
    for (const language of Object.keys(DICTIONARIES) as TranslationLanguage[]) {
      // getTranslations answers from the cache and nothing else, so it can
      // return undefined for a language nobody has loaded. tests/setup.ts
      // primes all five, which is what makes this a real lookup rather than
      // a assertion about loading.
      const dictionary = getTranslations(language);
      expect(dictionary, `${language} was not primed`).toBeDefined();

      const descriptions = dictionary!.settings.appLanguage.descriptions;

      expect(Object.keys(descriptions).sort()).toEqual(
        Object.keys(DICTIONARIES).sort(),
      );
    }
  });

  it("ships a dictionary for exactly the languages the picker offers", () => {
    const offered = getInterfaceLanguages().map((meta) => meta.code).sort();

    expect(offered).toEqual(["en", "es", "fr", "it", "zh-TW"]);
  });

  it("is not a copy of the English one", () => {
    // A dictionary that typechecks but was never translated would pass every
    // test above. Most strings differing is the cheapest evidence it is real.
    for (const [language, dictionary] of Object.entries(DICTIONARIES)) {
      if (language === "english") continue;

      const flat = flatten(dictionary);
      const differing = Object.keys(flatEnglish).filter(
        (key) => flat[key] !== flatEnglish[key],
      );

      expect(
        differing.length / Object.keys(flatEnglish).length,
        language,
      ).toBeGreaterThan(0.8);
    }
  });
});
