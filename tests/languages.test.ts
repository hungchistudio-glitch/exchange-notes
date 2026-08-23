import { describe, expect, it } from "vitest";

import {
  LANGUAGE_CODES,
  getInterfaceLanguages,
  getLanguage,
  getLearningLanguages,
  readLanguageCode,
  resolveLanguageCode,
} from "@/lib/languages";

describe("resolveLanguageCode", () => {
  it("accepts the codes the app writes", () => {
    for (const code of LANGUAGE_CODES) {
      expect(resolveLanguageCode(code)).toBe(code);
    }
  });

  it("accepts the speech tags the Scriptable widget sends", () => {
    // The widget builds /speak?language=en-US on the user's phone. That is a
    // speech tag, not a language code, and the two only look alike.
    expect(resolveLanguageCode("en-US")).toBe("en");
    expect(resolveLanguageCode("zh-TW")).toBe("zh-TW");
    expect(resolveLanguageCode("es-ES")).toBe("es");
    expect(resolveLanguageCode("fr-FR")).toBe("fr");
    expect(resolveLanguageCode("it-IT")).toBe("it");
  });

  it("accepts a region the table does not carry", () => {
    expect(resolveLanguageCode("en-GB")).toBe("en");
    expect(resolveLanguageCode("es-MX")).toBe("es");
  });

  it("still accepts the prose values older rows and widgets may hold", () => {
    expect(resolveLanguageCode("english")).toBe("en");
    expect(resolveLanguageCode("traditional-chinese")).toBe("zh-TW");
  });

  it("returns null rather than guessing", () => {
    expect(resolveLanguageCode("klingon")).toBeNull();
    expect(resolveLanguageCode("")).toBeNull();
    expect(resolveLanguageCode(null)).toBeNull();
    expect(resolveLanguageCode(42)).toBeNull();
  });

  it("stays wider than readLanguageCode, which reads a database column", () => {
    // A speech tag has no business being accepted out of profiles, so the
    // two functions are deliberately not the same function.
    expect(readLanguageCode("en-US")).toBeNull();
    expect(resolveLanguageCode("en-US")).toBe("en");
  });
});

describe("what the app offers", () => {
  it("can teach every language it knows", () => {
    expect(getLearningLanguages().map((meta) => meta.code)).toEqual([
      ...LANGUAGE_CODES,
    ]);
  });

  it("speaks every language it teaches, now that all five have dictionaries", () => {
    expect(getInterfaceLanguages().map((meta) => meta.code)).toEqual([
      ...LANGUAGE_CODES,
    ]);
  });

  it("keeps the two axes as separate flags even where they agree", () => {
    /*
     * They happen to match today. That is a fact about how much has shipped,
     * not a rule — a language can be learnable long before the app is
     * translated into it, which is exactly where French and Italian sat until
     * their dictionaries landed. Asserting the flags exist independently
     * guards against someone collapsing one into the other because they are
     * currently equal.
     */
    for (const meta of LANGUAGE_CODES.map(getLanguage)) {
      expect(typeof meta.availableAsInterface).toBe("boolean");
      expect(typeof meta.availableAsLearning).toBe("boolean");
    }
  });
});
