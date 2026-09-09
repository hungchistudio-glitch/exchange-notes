import { describe, expect, it } from "vitest";

import { classifyQueryKind, countTokens } from "@/lib/lexicon/queryKind";

/* =========================================================
   How much was asked

   Not cosmetic: a word becomes a review card, a sentence must not. A deck
   whose cards are paragraphs is a deck nobody can be tested on, and that is
   what saving whole sentences quietly produces.
   ========================================================= */

describe("counting words in scripts that do not space them", () => {
  it("counts Latin words by their spaces", () => {
    expect(countTokens("mow the lawn")).toBe(3);
  });

  it("counts Han characters at roughly two per word", () => {
    expect(countTokens("修剪")).toBe(1);
    expect(countTokens("我需要修剪草坪")).toBe(4);
  });

  it("has nothing to count in an empty string", () => {
    expect(countTokens("   ")).toBe(0);
  });
});

describe("word, phrase, sentence", () => {
  it("calls a single word a word", () => {
    expect(classifyQueryKind("mow")).toBe("word");
    expect(classifyQueryKind("tondre")).toBe("word");
    expect(classifyQueryKind("修剪")).toBe("word");
  });

  it("calls a short collocation a phrase", () => {
    expect(classifyQueryKind("mow the lawn")).toBe("phrase");
  });

  it("calls a full sentence a sentence", () => {
    expect(classifyQueryKind("I need to mow the lawn tomorrow.")).toBe(
      "sentence",
    );
  });

  it("takes a full stop as the writer saying so", () => {
    // Quoted from something they read, rather than a word they are naming.
    expect(classifyQueryKind("Go home.")).toBe("sentence");
  });

  it("does not mistake a lone abbreviation for a sentence", () => {
    expect(classifyQueryKind("etc.")).toBe("word");
  });

  it("reads a long Han run as more than one word", () => {
    expect(classifyQueryKind("沒有時間割草")).toBe("phrase");
  });
});
