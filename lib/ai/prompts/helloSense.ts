import { promptLanguageName, whenScriptRuleApplies } from "@/lib/ai/languagePrompt";
import type { LanguageCode } from "@/lib/languages";
import { HELLO_TEXT_MAX } from "@/lib/hello/text";

/*
 * One sense, in the languages it is missing — for Yumi's hello (lib/hello).
 *
 * A hello shows one word in any two of the five languages, and a visitor may
 * switch to any other two. Every side is made here, once, when the hello is
 * created, so a visitor never reaches a model at all.
 *
 * The known sides travel together, as in translateVocabulary.ts: "bank" in
 * English alone is the money or the river; "bank" with 銀行 is not. And every
 * side is made from them — never from another translation — so French,
 * then Italian, then English is each one step from the sharer's own words
 * and cannot drift.
 */

export type HelloSenseKnown = {
  language: LanguageCode;
  text: string;
  partOfSpeech?: string | null;
};

export const HELLO_PARTS_OF_SPEECH = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "phrase",
  "other",
] as const;

export const HELLO_SENSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    sides: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          language: { type: "string", enum: ["en", "zh-TW", "es", "fr", "it"] },
          text: { type: "string", minLength: 1, maxLength: HELLO_TEXT_MAX },
          partOfSpeech: { type: "string", enum: [...HELLO_PARTS_OF_SPEECH] },
        },
        required: ["language", "text", "partOfSpeech"],
      },
    },
  },
  required: ["sides"],
};

export function buildHelloSensePrompt(
  known: readonly HelloSenseKnown[],
  targets: readonly LanguageCode[],
): string {
  const knownBlock = known
    .map(
      (side) =>
        `- ${promptLanguageName(side.language)} (${side.language}): ${side.text}${
          side.partOfSpeech ? ` [${side.partOfSpeech}]` : ""
        }`,
    )
    .join("\n");
  const targetList = targets
    .map((language) => `${promptLanguageName(language)} (${language})`)
    .join(", ");
  const scriptRule = whenScriptRuleApplies(
    targets,
    "\n- Every Chinese character must be Traditional as written in Taiwan. Never a Simplified character, anywhere, for any reason.",
  );

  return `
One word, in the languages below. Every line is the same meaning.

${knownBlock}

Give that same meaning in: ${targetList}.

Rules:
- The same sense, not a related word. The lines above are given together so
  that a word that is ambiguous in one language is settled by the others.
- "text" is the word or the shortest natural phrase, in the form it would be
  looked up in a dictionary — not a sentence, not an explanation, and no
  quotation marks. Where a language has no single word for it, give the
  shortest gloss a speaker would understand, at most six words.
- A name, or a piece of culture with no counterpart, is given in the form a
  speaker of that language would actually use, borrowed or transliterated.
- "partOfSpeech" is one of: ${HELLO_PARTS_OF_SPEECH.join(", ")}.
- "language" is the code in brackets above. One entry per requested language,
  and nothing else.${scriptRule}
  `.trim();
}
