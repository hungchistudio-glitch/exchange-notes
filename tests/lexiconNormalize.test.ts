import { describe, expect, it } from "vitest";

import {
  canonicalTerm,
  differsOnlyByAccent,
  identityKey,
  matchKey,
  normalizeQuery,
} from "@/lib/lexicon/normalize";

/* =========================================================
   Two questions, two amounts of forgiveness

   "Is this the word I meant?" should forgive a missing accent. "Is this the
   word I already have?" must not — *papa* is a potato and *papá* is a
   father, and a duplicate check that folds them together refuses to save the
   second one, which loses data the reader cannot get back.
   ========================================================= */

describe("normalizing a query", () => {
  it("folds full-width characters a CJK keyboard produces by accident", () => {
    expect(normalizeQuery("ｍｏｗ")).toBe("mow");
  });

  it("collapses whitespace without touching the letters", () => {
    expect(normalizeQuery("  mow \t the   lawn ")).toBe("mow the lawn");
  });

  it("leaves case alone — that is the matcher's job, not this one's", () => {
    expect(normalizeQuery("Mow")).toBe("Mow");
  });
});

describe("the matching key, which is generous", () => {
  it("finds an accented word from an unaccented spelling", () => {
    expect(matchKey("ete")).toBe(matchKey("été"));
  });

  it("ignores case and punctuation", () => {
    expect(matchKey("Mow!")).toBe(matchKey("mow"));
  });

  it("leaves Chinese alone rather than folding it like Latin text", () => {
    expect(matchKey("修剪")).toBe("修剪");
  });
});

describe("the identity key, which is strict", () => {
  it("treats three casings of one word as one word", () => {
    expect(identityKey("MOW", "en")).toBe(identityKey("mow", "en"));
    expect(identityKey("Mow", "en")).toBe(identityKey("mow", "en"));
  });

  it("keeps accents, because they are letters", () => {
    // Spanish: potato and father. Two cards, and the app must be able to
    // hold both.
    expect(identityKey("papa", "es")).not.toBe(identityKey("papá", "es"));
  });

  it("keeps the same spelling in two languages apart", () => {
    // "come" is an English verb and an Italian conjunction. A duplicate key
    // without the language refuses to save the second one.
    expect(identityKey("come", "en")).not.toBe(identityKey("come", "it"));
  });
});

describe("offering a correction without applying one", () => {
  it("recognises a missing accent", () => {
    expect(differsOnlyByAccent("ete", "été")).toBe(true);
  });

  it("does not call two different words a spelling slip", () => {
    expect(differsOnlyByAccent("ete", "etre")).toBe(false);
  });

  it("stores the language's own spelling", () => {
    expect(canonicalTerm("ete", "été")).toBe("été");
  });
});
