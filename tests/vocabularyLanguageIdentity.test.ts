import { describe, expect, it } from "vitest";

import {
  correctedLanguageIdentity,
  relabelLanguage,
  resolveLanguageIdentity,
} from "@/lib/vocabulary/languageIdentity";

/* =========================================================
   A vocabulary card remembers the language it was born in

   These are the acceptance cases for the whole feature: a word saved under
   one pairing keeps its languages when the reader moves to another, and the
   app is honest about which of its answers were guesses.
   ========================================================= */

describe("what the creation flow already knows", () => {
  it("takes the pair outright when the flow states it", () => {
    const identity = resolveLanguageIdentity({
      term: "tondre",
      translation: "mow",
      pair: ["fr", "en"],
      stated: { term: "fr", translation: "en" },
    });

    expect(identity.termLanguage).toBe("fr");
    expect(identity.translationLanguage).toBe("en");
    expect(identity.source).toBe("user-settings");
    expect(identity.confidence).toBe(1);
    expect(identity.needsReview).toBe(false);
  });

  it("records the pair the reader had at the time, whatever wins", () => {
    const identity = resolveLanguageIdentity({
      term: "tondre",
      translation: "mow",
      pair: ["fr", "en"],
      stated: { term: "fr", translation: "en" },
    });

    expect(identity.pairAtCreation).toEqual({ primary: "fr", secondary: "en" });
  });

  it("marks a language somebody else stated as an explicit selection", () => {
    // A word card from a friend studying something else. It is still their
    // statement about their word, not the receiver's settings.
    const identity = resolveLanguageIdentity({
      term: "te amo",
      translation: "I love you",
      pair: ["it", "zh-TW"],
      stated: { term: "es", translation: "en", source: "explicit-selection" },
    });

    expect(identity.termLanguage).toBe("es");
    expect(identity.source).toBe("explicit-selection");
  });

  it("never lets both sides be the same language", () => {
    // The database refuses such a row, and it is right to: a word and its
    // translation in one language is the same text twice.
    const identity = resolveLanguageIdentity({
      term: "solo",
      translation: "solo",
      pair: ["it", "zh-TW"],
      stated: { term: "it", translation: "it" },
    });

    expect(identity.termLanguage).toBe("it");
    expect(identity.translationLanguage).not.toBe("it");
  });
});

describe("what a model reported", () => {
  it("is used when the flow said nothing", () => {
    const identity = resolveLanguageIdentity({
      term: "mangiare",
      translation: "to eat",
      pair: ["en", "zh-TW"],
      ai: { termLanguage: "it", translationLanguage: "en", confidence: 0.95 },
    });

    expect(identity.termLanguage).toBe("it");
    expect(identity.source).toBe("ai");
    expect(identity.confidence).toBe(0.95);
  });

  it("loses to the flow, which knows rather than infers", () => {
    const identity = resolveLanguageIdentity({
      term: "tondre",
      translation: "mow",
      pair: ["fr", "en"],
      stated: { term: "fr", translation: "en" },
      ai: { termLanguage: "it", translationLanguage: "en" },
    });

    expect(identity.termLanguage).toBe("fr");
    expect(identity.source).toBe("user-settings");
  });

  it("ignores anything that is not a language code", () => {
    const identity = resolveLanguageIdentity({
      term: "mangiare",
      translation: "to eat",
      pair: ["en", "zh-TW"],
      ai: { termLanguage: "Italian", translationLanguage: "fr-FR" },
    });

    // "Italian" is not a code, so the model said nothing usable and the
    // detector answers instead.
    expect(identity.source).toBe("auto-detected");
    expect(identity.termLanguage).toBe("it");
  });

  it("flags a model that says it was unsure", () => {
    const identity = resolveLanguageIdentity({
      term: "solo",
      translation: "alone",
      pair: ["en", "zh-TW"],
      ai: { termLanguage: "it", translationLanguage: "en", confidence: 0.3 },
    });

    expect(identity.needsReview).toBe(true);
  });
});

describe("what the text itself says", () => {
  it("reads a clear word off its own spelling", () => {
    const identity = resolveLanguageIdentity({
      term: "mangiare",
      translation: "to eat",
      pair: ["en", "zh-TW"],
    });

    expect(identity.termLanguage).toBe("it");
    expect(identity.source).toBe("auto-detected");
    expect(identity.needsReview).toBe(false);
  });

  it("does not guess at a word four languages share", () => {
    const identity = resolveLanguageIdentity({
      term: "solo",
      translation: "",
      pair: ["it", "zh-TW"],
    });

    // Filed under the reader's pair because something has to be stored, and
    // flagged so the card can offer to be corrected rather than pretending
    // the question was settled.
    expect(identity.termLanguage).toBe("it");
    expect(identity.source).toBe("user-settings");
    expect(identity.needsReview).toBe(true);
    expect(identity.confidence).toBeLessThan(0.6);
  });

  it("never dresses a guess up as a certainty", () => {
    const identity = resolveLanguageIdentity({
      term: "menu",
      translation: "",
      pair: ["fr", "en"],
    });

    expect(identity.confidence).toBeLessThan(1);
  });
});

/* =========================================================
   The reader's own correction
   ========================================================= */

describe("correcting a language by hand", () => {
  it("outranks everything and is not a guess", () => {
    const corrected = correctedLanguageIdentity("it", {
      translationLanguage: "en",
      pairAtCreation: { primary: "es", secondary: "en" },
    });

    expect(corrected.termLanguage).toBe("it");
    expect(corrected.translationLanguage).toBe("en");
    expect(corrected.source).toBe("user-corrected");
    expect(corrected.confidence).toBe(1);
    expect(corrected.needsReview).toBe(false);
  });

  it("moves the gloss out of the way when it collides", () => {
    const corrected = correctedLanguageIdentity("en", {
      translationLanguage: "en",
      pairAtCreation: { primary: "es", secondary: "en" },
    });

    expect(corrected.translationLanguage).not.toBe("en");
  });

  it("moves the headword to its new key, replacing a filled-in guess", () => {
    // The row was misread as Spanish, so the fill produced an Italian
    // "translation" of a word that was Italian all along. The reader's own
    // text is the one that is certainly right.
    const texts = { es: "solo", it: "assolo", en: "alone" };

    expect(relabelLanguage(texts, "es", "it")).toEqual({
      it: "solo",
      en: "alone",
    });
  });

  it("leaves a map alone when the language did not move", () => {
    const texts = { es: "solo", en: "alone" };
    expect(relabelLanguage(texts, "es", "es")).toEqual(texts);
  });

  it("drops the old key even when there is nothing to move", () => {
    expect(relabelLanguage({ en: "alone" }, "es", "it")).toEqual({
      en: "alone",
    });
  });
});
