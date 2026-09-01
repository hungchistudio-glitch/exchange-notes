import { describe, expect, it } from "vitest";

import {
  buildRewriteExamplesPrompt,
  exampleSentenceRules,
} from "@/lib/ai/prompts/exampleSentence";
import { buildIdentifyObjectPrompt } from "@/lib/ai/prompts/identifyObject";
import { buildClassifyTextPrompt } from "@/lib/ai/prompts/classifyText";
import { buildTranslateVocabularyPrompt } from "@/lib/ai/prompts/translateVocabulary";
import { buildDailyNewsPrompt } from "@/lib/ai/prompts/dailyNews";

/* =========================================================
   Every prompt that asks for an example asks for the same thing

   Four surfaces produce example sentences and each used to define a good one
   for itself. Two of them — the camera and the search box, where nearly
   every word in a library is born — defined it as "a short natural
   sentence", which is a description of grammar rather than of usefulness.
   What came back was accurate, natural, and mostly about the object rather
   than about the word: "The human skeleton consists of 206 bones."

   The news cards had a sharper version of the same problem, and a traceable
   cause. That prompt required examples that "must not introduce new claims
   about the article", which is exactly right for a headline and exactly
   wrong for a vocabulary example — it tied every sentence to the story, so
   readers kept words attached to journalism they can never reuse: "Mary
   John, who has died aged 85, was a developmental psychologist."

   These cases are about drift. The rules now live in one module, and the
   thing worth asserting is that no prompt quietly stops including them.
   ========================================================= */

const RULES = exampleSentenceRules();

/*
 * The news prompt nests them under its "vocabulary:" bullet, because its
 * produce list is one bullet per output field — rules left at the outer
 * level would read as governing the headline and the summary too, and "no
 * named individuals" is exactly wrong for a news headline.
 */
const NESTED_RULES = exampleSentenceRules({ indent: "  " });

const PAIR = ["en", "zh-TW"] as const;

const prompts: Array<[string, () => string, string]> = [
  ["the camera", () => buildIdentifyObjectPrompt(PAIR), RULES],
  [
    "the search box",
    () =>
      buildClassifyTextPrompt({
        query: "mug",
        roles: { learning: "en", support: "zh-TW", native: "zh-TW" },
        kind: "word",
      }),
    RULES,
  ],
  [
    "the background fill",
    () =>
      buildTranslateVocabularyPrompt(
        [{ id: "1", known: [{ language: "en", text: "mug" }] }],
        "it",
      ),
    RULES,
  ],
  [
    "the news cards",
    () =>
      buildDailyNewsPrompt(
        [{ category: "world", title: "A headline", excerpt: "An excerpt." }],
        PAIR,
      ),
    NESTED_RULES,
  ],
];

describe("the shared definition of a good example", () => {
  it.each(prompts)("reaches %s", (_name, build, expected) => {
    expect(build()).toContain(expected);
  });

  it("keeps every line when nested, changing only the margin", () => {
    // An indent that dropped or re-wrapped a rule would be a silent edit to
    // the one prompt that most needed these.
    expect(NESTED_RULES.split("\n")).toHaveLength(RULES.split("\n").length);
    expect(NESTED_RULES.replace(/^ {2}/gm, "")).toBe(RULES);
  });

  it("says what an example is for, not just what shape it is", () => {
    // The rules are the point; if they ever become decoration this catches it.
    expect(RULES).toContain("shows the word being used");
    expect(RULES).toContain("stand on its own");
  });
});

describe("a word met in the news still belongs to the reader", () => {
  const news = () =>
    buildDailyNewsPrompt(
      [
        {
          category: "world",
          title: "Mary John dies aged 85",
          excerpt: "The developmental psychologist has died.",
        },
      ],
      PAIR,
    );

  it("tells the model the example is not about the article", () => {
    expect(news()).toContain("not about the article");
  });

  it("no longer forbids only new claims, which was what tied it to the story", () => {
    /*
     * The old line read "Examples must not introduce new claims about the
     * article". Read literally it forbids invention; read by a model writing
     * a sentence, it means "write about the article", and that is what came
     * back.
     */
    expect(news()).not.toContain("must not introduce new claims");
  });

  it("still refuses to invent facts where it is describing the article", () => {
    // The constraint was moved, not dropped. Losing it would let the summary
    // and the headline drift from the excerpt, which is a worse bug.
    const prompt = news();

    expect(prompt).toContain("title, summary and caption");
    expect(prompt).toContain(
      "Do not invent\nor add any detail, quote, or claim that is not present in the given text.",
    );
  });
});

/* =========================================================
   Rewriting the sentences already saved

   The prompts above only govern the next word. Two hundred sentences already
   in the library were written under the old instructions and stay wrong
   until something rewrites them, which is what this prompt and
   scripts/rewrite-example-sentences.mjs are for.

   The case below is the one that only showed up by running it. An early
   version told the model to use "that language's own form of the word, given
   above", which is right about which word and wrong about which form: the
   list gives dictionary entries, and Traditional Chinese adjectives are
   filed with a trailing 的 that a sentence does not always want. What came
   back was 她對這次面試感到非常有信心的 — the stored form pasted in whole, and
   not a grammatical sentence.
   ========================================================= */

describe("asking for a replacement sentence", () => {
  const build = () =>
    buildRewriteExamplesPrompt(
      [
        {
          id: "1",
          known: [
            { language: "en", text: "confident" },
            { language: "zh-TW", text: "有信心的" },
          ],
          partOfSpeech: "adjective",
        },
      ],
      ["en", "zh-TW"],
    );

  it("carries the shared rules", () => {
    expect(build()).toContain(RULES);
  });

  it("asks for the form the sentence needs, not the form on file", () => {
    const prompt = build();

    expect(prompt).toContain("grammatical form the sentence actually needs");
    // Named outright, because a rule stated only in the abstract is what
    // produced 感到非常有信心的 in the first place.
    expect(prompt).toContain("有信心的");
  });

  it("still refuses a different word", () => {
    // Loosening the form must not loosen which word — a "synonym" here means
    // the reader's saved word never appears in its own example.
    expect(build()).toContain("not a synonym");
  });

  it("names only the languages a word is actually known in", () => {
    const prompt = buildRewriteExamplesPrompt(
      [{ id: "1", known: [{ language: "fr", text: "tondre" }] }],
      ["fr"],
    );

    expect(prompt).toContain("French: tondre");
    expect(prompt).not.toContain("Italian");
  });

  it("brings the Traditional Chinese rule only when Chinese is involved", () => {
    // Telling a model working in Spanish and French about Simplified
    // characters is the noise lib/ai/languagePrompt exists to avoid.
    expect(build()).toContain("Traditional");

    const romance = buildRewriteExamplesPrompt(
      [{ id: "1", known: [{ language: "fr", text: "tondre" }] }],
      ["fr", "es"],
    );

    expect(romance).not.toContain("Traditional");
  });
});
