import { describe, expect, it } from "vitest";

import {
  LANGUAGE_CODES,
  getInterfaceLanguages,
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

  it("still speaks fewer languages than it teaches", () => {
    // The two axes are separate on purpose: French is learnable without the
    // app being translated into French. Equating them is the mistake this
    // guards against.
    const interfaces = getInterfaceLanguages().map((meta) => meta.code);

    expect(interfaces).not.toContain("fr");
    expect(interfaces).not.toContain("it");
    expect(interfaces.length).toBeLessThan(LANGUAGE_CODES.length);
  });
});
