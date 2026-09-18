import { describe, expect, it } from "vitest";

import {
  cleanExampleSentence,
  stripRomanisation,
} from "@/lib/ai/prompts/exampleSentence";

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

/* =========================================================
   Cutting a stored answer back to the sentence

   Every string below is a real value from the library on 2026-09-18, shortened
   only where it repeats itself. All 20 of the over-long rows are Traditional
   Chinese; all 1,525 rows in the other four languages are a single sentence
   under 132 characters, so the shape being cut is a Chinese-only failure and
   the cases that must survive untouched are the ordinary ones.
   ========================================================= */
describe("cleanExampleSentence", () => {
  it("keeps the sentence and drops the pinyin, the gloss and the other languages", () => {
    expect(
      cleanExampleSentence(
        "站了一整天，我真的好需要腳底按摩。(Zhàn le yī zhěng tiān, wǒ zhēnde hǎo xūyào jiǎodǐ ànmó.)\n\n*Spanish:* Después de estar de pie todo el día, me vendría muy bien un masaje de pies.",
      ),
    ).toBe("站了一整天，我真的好需要腳底按摩。");
  });

  it("cuts at a language heading that has no bracket before it", () => {
    expect(
      cleanExampleSentence(
        "今年勞動的成本顯著增加了。 Spanish: El costo de la mano de obra ha aumentado significativamente este año.",
      ),
    ).toBe("今年勞動的成本顯著增加了。");
  });

  it("cuts where the model starts talking to itself", () => {
    expect(
      cleanExampleSentence(
        "因為流感突然爆發，學校只好停課了。 (Note: 疫情爆發 is the noun.) Actually, let's use: 最近流感疫情爆發，導致學校被迫停課了。",
      ),
    ).toBe("因為流感突然爆發，學校只好停課了。");

    expect(
      cleanExampleSentence(
        "那邊那位女人正在找她遺失的雨傘，你有看到嗎？(那邊那位女人正在找她遺失的雨傘。 is fine too, but this flows better.) -> 那邊那位女人正在找她遺失的雨傘，你看到了嗎？",
      ),
    ).toBe("那邊那位女人正在找她遺失的雨傘，你有看到嗎？");
  });

  it("drops a JSON-shaped answer back to its first sentence", () => {
    expect(
      cleanExampleSentence(
        "救護人員證實了車禍現場的死亡案例。 'es': 'Los paramédicos confirmaron la víctima mortal.'",
      ),
    ).toBe("救護人員證實了車禍現場的死亡案例。");
  });

  /*
   * The rows that must not be touched. A Latin word inside a Chinese sentence
   * is the whole point of the word being saved — 元音變換 is filed with an
   * example about "sing" and "sang" — and the four Latin-script languages are
   * 1,525 of the library's 1,989 filled slots.
   */
  it("leaves an ordinary sentence exactly as it is", () => {
    const withLatin = "「Sing」和「sang」之間的變化是元音變換的經典例子。";
    expect(cleanExampleSentence(withLatin)).toBe(withLatin);

    const french = "Il est arrivé en retard (comme toujours) à la réunion.";
    expect(cleanExampleSentence(french)).toBe(french);

    const english = "She broke her wrist skiing last winter.";
    expect(cleanExampleSentence(english)).toBe(english);

    const chinese = "他去了台北（不是台中）看朋友。";
    expect(cleanExampleSentence(chinese)).toBe(chinese);
  });

  it("returns undefined when nothing usable is left", () => {
    expect(cleanExampleSentence("")).toBeUndefined();
    expect(cleanExampleSentence(undefined)).toBeUndefined();
  });
});
