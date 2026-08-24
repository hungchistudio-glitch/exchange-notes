import { describe, expect, it } from "vitest";

import {
  DETECTION_CONFIDENCE_FLOOR,
  detectLanguage,
} from "@/lib/languageDetection";

/* =========================================================
   Guessing a language, and admitting when it is a guess

   The detector is the last thing consulted about a saved word — see
   resolveLanguageIdentity — and its most valuable output is not the answer
   but the confidence attached to it. A word it cannot place must say so, so
   the app can ask instead of filing somebody's word under the wrong language
   for the rest of its life.
   ========================================================= */

describe("what the script settles on its own", () => {
  it("reads Han characters as Chinese without weighing anything else", () => {
    const result = detectLanguage("修剪");

    expect(result.language).toBe("zh-TW");
    expect(result.ambiguous).toBe(false);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it("still reads Chinese when Latin text is mixed in", () => {
    // A Latin suffix in the same string must not outvote the writing system.
    expect(detectLanguage("修剪 lawn").language).toBe("zh-TW");
  });
});

describe("words that carry their language in their spelling", () => {
  const clear: Array<[string, string]> = [
    ["mangiare", "it"],
    ["bagaglio", "it"],
    ["tondre", "fr"],
    ["heureuse", "fr"],
    ["mañana", "es"],
    ["canción", "es"],
    ["thoughtful", "en"],
    ["watching", "en"],
  ];

  for (const [word, language] of clear) {
    it(`places "${word}" as ${language}`, () => {
      const result = detectLanguage(word);

      expect(result.language).toBe(language);
      expect(result.ambiguous).toBe(false);
      expect(result.confidence).toBeGreaterThanOrEqual(
        DETECTION_CONFIDENCE_FLOOR,
      );
    });
  }
});

describe("words that belong to several languages at once", () => {
  /*
   * The words this whole design exists for. Each is a real word in three or
   * four of the five languages, and nothing in its spelling separates them —
   * so a detector that answered confidently would be confidently wrong three
   * times in four.
   */
  const shared = ["solo", "no", "menu", "radio", "taxi", "hotel"];

  for (const word of shared) {
    it(`refuses to settle "${word}" alone`, () => {
      const result = detectLanguage(word);

      expect(result.ambiguous).toBe(true);
      expect(result.confidence).toBeLessThan(DETECTION_CONFIDENCE_FLOOR);
    });
  }

  it("offers real alternatives to choose between", () => {
    const result = detectLanguage("solo");

    expect(result.candidates.length).toBeGreaterThan(1);
    expect(result.candidates).toContain("it");
    expect(result.candidates).toContain("es");
  });

  it("says nothing at all about an empty string", () => {
    const result = detectLanguage("   ");

    expect(result.language).toBeNull();
    expect(result.confidence).toBe(0);
    expect(result.ambiguous).toBe(true);
  });
});

describe("narrowing the field", () => {
  it("is more certain when the caller already knows the shortlist", () => {
    const open = detectLanguage("solo");
    const narrowed = detectLanguage("solo", ["it", "zh-TW"]);

    // Between Italian and Chinese, a Latin-script word is not much of a
    // question. Between four Latin languages it is entirely one.
    expect(narrowed.confidence).toBeGreaterThanOrEqual(open.confidence);
    expect(narrowed.candidates).not.toContain("es");
  });

  it("never answers with a language it was not offered", () => {
    const result = detectLanguage("mangiare", ["fr", "es"]);

    expect(result.language === null || ["fr", "es"]).toBeTruthy();
    expect(result.candidates.every((code) => code === "fr" || code === "es"))
      .toBe(true);
  });
});
