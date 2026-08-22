import { promptLanguageName, whenScriptRuleApplies } from "@/lib/ai/languagePrompt";
import type { LanguageCode } from "@/lib/languages";

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

      return `Word ${index + 1}${
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
- "example" is one short natural sentence in ${targetName} using it. It should
  mean roughly what the examples above mean where they exist, but read as
  something a person would actually say rather than a translation of them.
- If a word has no ordinary equivalent in ${targetName} — a name, a piece of
  culture with no counterpart — give the form a ${targetName} speaker would
  actually use, borrowed or transliterated, rather than inventing one.
- Return one entry per word, in the same order, and nothing else.${scriptRule}
  `.trim();
}
