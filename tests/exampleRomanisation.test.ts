import { describe, expect, it } from "vitest";

import { stripRomanisation } from "@/lib/ai/prompts/exampleSentence";

/* =========================================================
   A pronunciation guide is not part of the sentence

   29 of the library's 464 Traditional Chinese examples carry a parenthesised
   pinyin gloss nothing asked for, and every surface that shows an example in
   a fixed width clips it mid-syllable. No other language has a single one,
   which is what says this is the model's habit on Chinese rather than
   anything a reader wanted.

   The prompt now forbids it, but a prompt only governs the next word, so the
   write path checks too. The risk in checking is over-reach: a bracketed
   aside inside a French sentence is the writer's, not a gloss, and stripping
   it would be a worse bug than the one being fixed. Hence the Latin-script
   cases below.
   ========================================================= */

describe("stripRomanisation", () => {
  it("drops a pinyin gloss from a Chinese sentence", () => {
    expect(
      stripRomanisation(
        "發生這起漏洞之後，他們不得不更改所有的密碼。(Fāshēng zhè qǐ lòudòng zhīhòu)",
      ),
    ).toBe("發生這起漏洞之後，他們不得不更改所有的密碼。");
  });

  it("handles full-width brackets too", () => {
    expect(stripRomanisation("我每天喝咖啡。（wǒ měitiān hē kāfēi）")).toBe(
      "我每天喝咖啡。",
    );
  });

  it("leaves a Latin-script sentence completely alone", () => {
    const french = "Il est arrivé en retard (comme toujours) à la réunion.";
    expect(stripRomanisation(french)).toBe(french);

    const english = "She broke her wrist (the left one) last winter.";
    expect(stripRomanisation(english)).toBe(english);
  });

  it("keeps a bracketed aside that is itself Chinese", () => {
    const sentence = "他去了台北（不是台中）看朋友。";
    expect(stripRomanisation(sentence)).toBe(sentence);
  });

  /*
   * Nothing worth storing comes back as undefined rather than as an empty
   * string, so a card that has no example shows none instead of a blank line
   * where one should be.
   */
  it("returns undefined rather than an empty example", () => {
    expect(stripRomanisation("   ")).toBeUndefined();
    expect(stripRomanisation(undefined)).toBeUndefined();
    expect(stripRomanisation(null)).toBeUndefined();
  });

  /*
   * Text carrying no CJK at all is returned untouched, even when it is
   * nothing but a romanisation.
   *
   * That is the conservative half of the bargain and it is deliberate. The
   * cost of over-reaching is a French or Italian sentence quietly losing a
   * parenthesis its writer meant — 375 and 342 rows respectively, against
   * zero rows of any language but Chinese that were found carrying a gloss.
   * A stripper that has to guess at the script is the wrong trade, so this
   * one only acts where it can see what it is protecting.
   */
  it("does not guess at text with no CJK in it", () => {
    const glossOnly = "（wǒ měitiān hē kāfēi）";
    expect(stripRomanisation(glossOnly)).toBe(glossOnly);
  });
});
