import { describe, expect, it } from "vitest";

import { LANGUAGE_CODES, getLanguage } from "@/lib/languages";

/* =========================================================
   Every language the app teaches can be heard

   The voice picker listed zh-TW and en-US, so a French or Italian learner
   had no voice setting at all — playback fell to whatever the platform
   picked, and on a device without those voices that is an English voice
   reading French. There was nothing anywhere to change it with.
   ========================================================= */

describe("spoken languages", () => {
  it("gives every language a speech tag of its own", () => {
    const tags = LANGUAGE_CODES.map((code) => getLanguage(code).speechTag);

    expect(new Set(tags).size).toBe(LANGUAGE_CODES.length);
    expect(tags).toContain("fr-FR");
    expect(tags).toContain("it-IT");
    expect(tags).toContain("es-ES");
  });

  it("previews each voice with a sentence in that language", () => {
    // Not translated at render time: hearing an English sentence read by a
    // French voice tells you nothing about how it will read French.
    const samples = LANGUAGE_CODES.map(
      (code) => getLanguage(code).voiceSample,
    );

    for (const sample of samples) {
      expect(sample.trim().length).toBeGreaterThan(0);
    }

    expect(new Set(samples).size).toBe(LANGUAGE_CODES.length);
  });

  it("writes each sample in the script that language uses", () => {
    expect(getLanguage("zh-TW").voiceSample).toMatch(/[一-鿿]/);

    // The Latin-script languages are told apart by their own words rather
    // than by script, so each is checked for something only it would say.
    expect(getLanguage("fr").voiceSample.toLowerCase()).toContain("bonjour");
    expect(getLanguage("it").voiceSample.toLowerCase()).toContain("ciao");
    expect(getLanguage("es").voiceSample.toLowerCase()).toContain("hola");
    expect(getLanguage("en").voiceSample.toLowerCase()).toContain("hello");
  });
});
