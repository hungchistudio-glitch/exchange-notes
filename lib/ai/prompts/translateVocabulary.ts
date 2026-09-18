import { promptLanguageName, whenScriptRuleApplies } from "@/lib/ai/languagePrompt";
import { exampleSentenceRules } from "@/lib/ai/prompts/exampleSentence";
import type { LanguageCode } from "@/lib/languages";

/*
 * The label a word is given in the prompt, and the label its answer must come
 * back under.
 *
 * Exported because the route matches on it. The two used to agree only by
 * both counting from zero — the prompt numbered the words, the schema had no
 * id at all, and the route read `answers[index]`. One dropped word shifted
 * every answer after it onto the wrong word, and it was written to the
 * reader's library looking exactly like a right answer.
 *
 * Short and opaque on purpose: a row's real UUID is 36 characters, twenty of
 * them is most of a prompt, and models mangle long identifiers they have no
 * use for.
 */
export function promptId(index: number) {
  return `w${index + 1}`;
}

export type VocabularyToTranslate = {
  id: string;
  /** What the word already is, in the languages it is already known in. */
  known: Array<{ language: LanguageCode; text: string; example?: string }>;
  partOfSpeech?: string | null;
};

/**
 * Adds one language to words the learner already has.
 *
 * Not a fresh lookup: these are words someone chose to save, already carrying
 * a meaning they settled on. The job is to say the same word in one more
 * language, not to reinterpret it — so every known side is given, and the
 * model is asked to agree with all of them rather than translate one.
 *
 * The source matters. Translating "bank" from English alone is a coin flip
 * between the money and the river; translating it from English *and* 銀行 is
 * not. That is why the existing languages travel together.
 */
export function buildTranslateVocabularyPrompt(
  items: VocabularyToTranslate[],
  target: LanguageCode,
): string {
  const targetName = promptLanguageName(target);

  const scriptRule = whenScriptRuleApplies(
    [target],
    "\n- Every Chinese character must be Traditional as written in Taiwan. Never a Simplified character, anywhere, for any reason.",
  );

  const block = items
    .map((item, index) => {
      const known = item.known
        .map(
          (side) =>
            `  ${promptLanguageName(side.language)}: ${side.text}` +
            (side.example ? `\n    example: ${side.example}` : ""),
        )
        .join("\n");

      return `Word ${promptId(index)}${
        item.partOfSpeech ? ` (${item.partOfSpeech})` : ""
      }:\n${known}`;
    })
    .join("\n\n");

  return `
Someone learning ${targetName} already saved these words, each in the
languages listed under it. Give each one its ${targetName} form.

${block}

Rules:
- Answer with the same word, not a related one. Every language listed under a
  word describes the same meaning, and they are given together so an ambiguous
  word in one is settled by the others.
- "text" is the word or phrase in ${targetName}, in the form it would be
  looked up in — not a sentence, and not an explanation.
- "example" is one example sentence in ${targetName} using it. Where the
  examples above exist it should mean roughly what they mean, but it must read
  as something a person would actually say rather than as a translation of
  them.
${exampleSentenceRules()}
- If a word has no ordinary equivalent in ${targetName} — a name, a piece of
  culture with no counterpart — give the form a ${targetName} speaker would
  actually use, borrowed or transliterated, rather than inventing one.
- "id" is the word's own label, copied exactly: the entry for Word w7 carries
  "id": "w7". It is what pairs your answer to the word it answers, so it is
  never renumbered, never reused, and never left out.
- Return one entry per word and nothing else. If a word genuinely cannot be
  answered, leave it out entirely rather than shifting the others up — a
  missing entry is handled, a misaligned one is not.${scriptRule}
  `.trim();
}
