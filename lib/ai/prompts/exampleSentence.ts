import { promptLanguageName, whenScriptRuleApplies } from "@/lib/ai/languagePrompt";
import type { LanguageCode } from "@/lib/languages";

/* =========================================================
   What makes an example sentence worth reading

   Four prompts produce example sentences — the camera, the search box, the
   background language fill and the news cards — and until now the first two
   said the whole of what they wanted in six words: "a short natural
   sentence". Natural is not the property that matters. A sentence can be
   perfectly natural English and still teach nobody anything about the word.

   The library says so. Of 395 stored English examples, fewer than a third
   put the word in a person's mouth; the rest describe the thing the word
   names, which is a different job that the translation already does:

     skeleton     "The human skeleton consists of 206 bones."
     phytoncide   "Plants release phytoncides to protect themselves…"
     phenomenon   "Scientists study this natural phenomenon to predict…"

   The news cards are worse, and for a traceable reason. That prompt told the
   model its examples "must not introduce new claims about the article",
   which is right for a headline and wrong for a vocabulary example — it
   anchors the sentence to the story, so the reader ends up with journalism
   about one specific event:

     developmental  "Mary John, who has died aged 85, was a developmental
                     psychologist."
     patron         "Panicked patrons are asking online how painful their
                     necks will feel after the movie."

   Neither of those can be reused, repeated, or adapted to anything the
   reader will ever say. Words saved from the news are 205 of this library
   and have the lowest share of usable sentences of any source — 26 percent
   against 56 for words saved from a photograph.

   So the rules live here, once, and every prompt that asks for an example
   includes them. Each prompt still writes its own sentence binding the
   fields to languages, because that part genuinely differs and was tuned
   per prompt; what is shared is the definition of a good answer.
   ========================================================= */

/**
 * The rules, as prompt lines.
 *
 * `indent` nests them under an enclosing bullet. The news prompt needs it:
 * its produce list is one bullet per output field, and rules left at the
 * outer level read as though they governed the headline and the summary too
 * — "no named individuals" is exactly wrong for a news headline. Everywhere
 * else these are already top-level rules and the default is right.
 */
export function exampleSentenceRules({ indent = "" } = {}): string {
  const rules = `
- An example shows the word being used; it does not say what the word means.
  "The human skeleton consists of 206 bones" describes the object and teaches
  nothing about the word. "She broke her wrist — you can see it on the X-ray"
  puts it to work. Definitions, encyclopedia facts about the thing, and
  sentences whose only purpose is to contain the word are all wrong answers.
- Write what one person would actually say or write to another: everyday
  register, an ordinary situation, usually with somebody in it.
- It must stand on its own. A reader who does not know where this word came
  from has to understand the sentence completely. No named individuals, no
  particular news event, no headline phrasing, nothing that only makes sense
  as part of a longer story.
- Use the word in its most ordinary sense, not a specialised or technical one,
  unless the word only has the specialised sense.
- Keep it short enough to remember and repeat.
- The sentence only, in its own script. No pronunciation guide, no
  romanisation, no pinyin, no translation, and nothing in brackets after it.`.trim();

  if (!indent) return rules;

  return rules
    .split("\n")
    .map((line) => (line ? indent + line : line))
    .join("\n");
}

/* =========================================================
   Taking the pronunciation guide back out

   The rule above is new; 29 of the library's 464 Traditional Chinese
   sentences were written before it existed and carry a parenthesised pinyin
   gloss the schema never asked for — 發生這起漏洞之後，他們不得不更改所有
   的密碼。(Fāshēng zhè qǐ lòudòng…) — which is then clipped mid-syllable by
   every surface that shows an example in a fixed width. No other language
   has a single one, which is what says this is a habit of the model on
   Chinese rather than anything a reader asked for.

   A rule in a prompt governs the next word and no others, so the write path
   checks too. Cheap, and it does not depend on the model having complied.
   ========================================================= */

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff]/;
const BRACKETED = /[（(][^）)]*[）)]/g;
const LATIN_ISH = /[A-Za-z\u00c0-\u024f]/g;

/**
 * Drops a parenthesised romanisation from a sentence written in a script that
 * does not use the Latin alphabet.
 *
 * Deliberately conditional on the sentence itself containing CJK: a French or
 * Spanish example is Latin from end to end, and a bracketed aside in one of
 * those is the writer's, not a pronunciation guide. Returns undefined for an
 * empty result so the caller stores nothing rather than an empty string.
 */
export function stripRomanisation(example: string | undefined | null) {
  const text = example?.trim();
  if (!text) return undefined;
  if (!CJK.test(text)) return text;

  const cleaned = text
    .replace(BRACKETED, (group) => {
      const inner = group.slice(1, -1);
      if (!inner.trim()) return group;
      if (CJK.test(inner)) return group;

      const latin = (inner.match(LATIN_ISH) ?? []).length;
      return latin / inner.length >= 0.5 ? "" : group;
    })
    .trim();

  return cleaned || undefined;
}

/** One saved word, in every language it is already known in. */
export type WordToExemplify = {
  id: string;
  known: Array<{ language: LanguageCode; text: string }>;
  partOfSpeech?: string | null;
};

/**
 * Asks for fresh examples for words that already have one.
 *
 * Distinct from buildTranslateVocabularyPrompt, which adds a language a word
 * does not yet have. This adds nothing: the word is already known in all of
 * these languages, and only the sentences are being replaced.
 *
 * It exists because the sentences already stored cannot be fixed by fixing
 * the prompts that wrote them — a prompt only governs the next word. Two
 * hundred of them are Guardian copy about one day's news ("Average growth in
 * total earnings, including bonuses, fell to 4.1% in the three months to
 * June"), and they will still be there tomorrow unless something rewrites
 * them.
 *
 * The old sentence is deliberately not shown to the model. Given it, the
 * model anchors on it and returns a paraphrase — which is the register that
 * is wrong, so the paraphrase is wrong too. The word and its meaning across
 * languages is all the context a good example needs.
 */
export function buildRewriteExamplesPrompt(
  items: WordToExemplify[],
  languages: readonly LanguageCode[],
): string {
  const keys = languages.map((code) => `"${code}"`).join(", ");

  const scriptRule = whenScriptRuleApplies(
    languages,
    "\n- Every Chinese character must be Traditional as written in Taiwan. Never a Simplified character, anywhere, for any reason.",
  );

  /*
   * The illustration for the rule above, and Chinese-only on purpose.
   *
   * It is the failure that rule was written for: 有信心的 is how the adjective
   * is filed, and the model pasted it in whole — 她對這次面試感到非常有信心的,
   * which is not a sentence. Stated in the abstract the rule was not enough;
   * stated to a model working in Spanish and French it is a paragraph about a
   * language nobody asked about, which is the noise whenScriptRuleApplies
   * exists to keep out of these prompts.
   */
  const formNote = whenScriptRuleApplies(
    languages,
    " For example 有信心的 is how that adjective is filed and 她對面試很有信心 is how it is said; a sentence ending 感到非常有信心的 is not Traditional Chinese.",
  );

  const block = items
    .map((item, index) => {
      const known = item.known
        .map((side) => `  ${promptLanguageName(side.language)}: ${side.text}`)
        .join("\n");

      return `Word ${index + 1}${
        item.partOfSpeech ? ` (${item.partOfSpeech})` : ""
      }:\n${known}`;
    })
    .join("\n\n");

  return `
Someone is learning with these saved words. Each is listed in the languages
they already know it in. Write one example sentence per word, in every
language listed for it.

${block}

Rules:
- "examples" is an object keyed by ${keys}, holding only the languages listed
  under that word. Every sentence must use that word — not a synonym, not a
  near-relative.
- Use the grammatical form the sentence actually needs, which is often not the
  form listed above. The list gives each word as it would be looked up: verbs
  uninflected, and adjectives sometimes carrying a particle that belongs to a
  dictionary entry rather than to a sentence. Changing it is required, not
  optional.${formNote}
- The sentences for one word are the same sentence in several languages. Each
  must read as though it had been written in its own language rather than
  translated from another.
${exampleSentenceRules()}
- Return one entry per word, in the same order, and nothing else.${scriptRule}
  `.trim();
}
