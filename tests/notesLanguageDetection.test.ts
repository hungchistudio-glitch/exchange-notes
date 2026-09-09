import { describe, expect, it } from "vitest";

import { detectNoteLanguage } from "@/lib/notes/languageDetection";

describe("note language detection", () => {
  it.each([
    ["在它消失之前，把這一刻留下來。", "zh-TW"],
    ["Hola, gracias por estar aquí", "es"],
    ["Bonjour et merci pour cette belle journée", "fr"],
    ["Ciao, grazie per essere qui con me", "it"],
    ["Keep the moment before it disappears.", "en"],
  ] as const)("suggests %s as %s", (text, language) => {
    expect(detectNoteLanguage(text)).toBe(language);
  });

  it("falls back to English for short ambiguous Latin text", () => {
    expect(detectNoteLanguage("la note")).toBe("en");
  });
});
