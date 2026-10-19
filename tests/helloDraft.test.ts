import { describe, expect, it } from "vitest";

import { knownFromLookup, parseHelloDraft } from "@/lib/hello/draft";
import type { LexiconEntry } from "@/lib/lexicon/types";

/* =========================================================
   A looked-up word, handed to the hello editor

   Only a word with a meaning to share becomes a hello — not a sentence,
   not a lookup whose translation never came — and whatever comes back
   out of this tab's storage is checked again: it is a suggestion of where
   the editor starts, never trusted as it is.
   ========================================================= */

function entry(overrides: Partial<LexiconEntry>): LexiconEntry {
  return {
    term: "library",
    termLanguage: "en",
    translation: "圖書館",
    translationLanguage: "zh-TW",
    partOfSpeech: "noun",
    ...overrides,
  } as LexiconEntry;
}

describe("a lookup as a hello's word", () => {
  it("gives both sides of a word", () => {
    expect(knownFromLookup(entry({}))).toEqual([
      { language: "en", text: "library", partOfSpeech: "noun" },
      { language: "zh-TW", text: "圖書館", partOfSpeech: "noun" },
    ]);
  });

  it("gives nothing for a sentence, a missing translation, or no lookup", () => {
    expect(knownFromLookup(entry({ kind: "sentence" } as Partial<LexiconEntry>))).toBeNull();
    expect(knownFromLookup(entry({ translationUnavailable: true }))).toBeNull();
    expect(knownFromLookup(null)).toBeNull();
  });
});

describe("a draft read back", () => {
  it("keeps the five languages, once each, short", () => {
    const raw = JSON.stringify([
      { language: "en", text: " library ", partOfSpeech: "noun" },
      { language: "en", text: "again" },
      { language: "de", text: "Bibliothek" },
      { language: "fr", text: "x".repeat(201) },
      { language: "zh-TW", text: "圖書館" },
    ]);
    expect(parseHelloDraft(raw)).toEqual([
      { language: "en", text: "library", partOfSpeech: "noun" },
      { language: "zh-TW", text: "圖書館", partOfSpeech: null },
    ]);
  });

  it("is nothing when it is not a draft", () => {
    expect(parseHelloDraft(null)).toBeNull();
    expect(parseHelloDraft("{")).toBeNull();
    expect(parseHelloDraft(JSON.stringify({ language: "en", text: "x" }))).toBeNull();
    expect(parseHelloDraft("[]")).toBeNull();
  });
});
