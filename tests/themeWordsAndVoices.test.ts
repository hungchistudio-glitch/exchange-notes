import { describe, expect, it } from "vitest";

import { LANGUAGE_CODES } from "@/lib/languages";
import { THEMES, THEME_WORDS_SHOWN, localDayNumber, themeWordsFor } from "@/lib/lexicon/themeWords";
import { voiceQuality } from "@/lib/speech";
import { estimateWordMs, segmentAt, segmentWords } from "@/lib/spokenWords";

/* =========================================================
   A first reader's feedback (Chi, 2026-11-13): somewhere to start, a voice
   that sounds less like a machine, and the word being said lit as it goes.
   ========================================================= */

describe("today's theme words", () => {
  it("has a name in every language and a full list in every language", () => {
    for (const theme of THEMES) {
      for (const code of LANGUAGE_CODES) {
        expect(theme.name[code], `${theme.id} ${code}`).toBeTruthy();
        expect(theme.words[code], `${theme.id} ${code}`).toHaveLength(8);
        expect(new Set(theme.words[code]).size, `${theme.id} ${code}`).toBe(8);
      }
    }
  });

  it("offers five words of one theme, and the next theme the next day", () => {
    const today = themeWordsFor(100, "en", []);
    const tomorrow = themeWordsFor(101, "en", []);

    expect(today?.words).toHaveLength(THEME_WORDS_SHOWN);
    expect(tomorrow?.theme.id).not.toBe(today?.theme.id);
    expect(themeWordsFor(100 + THEMES.length, "en", [])?.theme.id).toBe(today?.theme.id);
  });

  it("passes over the words the reader already keeps, accents and case aside", () => {
    const day = THEMES.findIndex((theme) => theme.id === "cafe");
    const offered = themeWordsFor(day, "es", ["Café", "TE"]);

    expect(offered?.theme.id).toBe("cafe");
    expect(offered?.words).not.toContain("café");
    expect(offered?.words).not.toContain("té");
    expect(offered?.words[0]).toBe("menú");
  });

  it("moves on to the next theme once every word of today's is kept", () => {
    const day = THEMES.findIndex((theme) => theme.id === "cafe");
    const cafe = THEMES[day].words.fr;

    expect(themeWordsFor(day, "fr", cafe)?.theme.id).toBe(THEMES[day + 1].id);
  });

  it("turns over at the reader's own midnight", () => {
    const evening = new Date(2026, 10, 13, 23, 59);
    const morning = new Date(2026, 10, 14, 0, 1);

    expect(localDayNumber(morning)).toBe(localDayNumber(evening) + 1);
  });
});

describe("which voice sounds most natural", () => {
  const voice = (name: string) =>
    ({ name, lang: "en-US", voiceURI: name, default: false, localService: true }) as SpeechSynthesisVoice;

  it("ranks the voices devices name as their good ones over the plain and the compact", () => {
    const ranked = [
      "Samantha (Enhanced)",
      "Alex",
      "Google US English",
      "Ava (Premium)",
      "Microsoft Ava Online (Natural) - English (United States)",
      "Samantha (Compact)",
      "Zarvox",
    ].sort((a, b) => voiceQuality(voice(b)) - voiceQuality(voice(a)));

    expect(ranked).toEqual([
      "Ava (Premium)",
      "Microsoft Ava Online (Natural) - English (United States)",
      "Samantha (Enhanced)",
      "Google US English",
      "Alex",
      "Samantha (Compact)",
      "Zarvox",
    ]);
  });
});

describe("the words of a text being said", () => {
  it("cuts Chinese into words, not characters, and keeps every character", () => {
    const text = "我們喜歡喝咖啡。";
    const segments = segmentWords(text, "zh-TW");

    expect(segments.map((segment) => segment.text).join("")).toBe(text);
    const words = segments.filter((segment) => segment.word);
    expect(words.length).toBeGreaterThan(1);
    expect(words.length).toBeLessThan(7);
  });

  it("finds the word a boundary falls in", () => {
    const segments = segmentWords("Il faut tondre la pelouse.", "fr-FR");

    expect(segments[segmentAt(segments, 0)].text).toBe("Il");
    expect(segments[segmentAt(segments, 8)].text).toBe("tondre");
    expect(segments[segmentAt(segments, 10)].text).toBe("tondre");
  });

  it("gives a syllabic script more time a character than an alphabet", () => {
    expect(estimateWordMs("咖啡")).toBeGreaterThan(estimateWordMs("co"));
    expect(estimateWordMs("a")).toBeGreaterThanOrEqual(180);
  });
});
