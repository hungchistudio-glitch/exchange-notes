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
const LATIN_ISH = /[A-Za-z\u00c0-\u024f]/;
const LATIN_ISH_ALL = /[A-Za-z\u00c0-\u024f]/g;

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

      const latin = (inner.match(LATIN_ISH_ALL) ?? []).length;
      return latin / inner.length >= 0.5 ? "" : group;
    })
    .trim();

  return cleaned || undefined;
}

/* =========================================================
   Where the sentence ends and the model's notes begin

   `maxLength` in a response schema is advisory. The rewrite script asks for
   at most 300 characters per sentence and the library holds one of 2,486 —
   a correct Chinese sentence followed by its pinyin, its English gloss, the
   Spanish, French and Italian versions, and in the worst cases the model's
   own deliberation, truncated mid-word: "Wait, the prompt requires".

   All 20 of the over-long rows are Traditional Chinese. Every one of the
   1,525 rows in the other four languages is a single sentence under 132
   characters. So this is not a length problem to be solved by trimming at a
   character count — it is one field that sometimes receives a whole answer,
   and the sentence wanted is always the part before the model changed
   subject.

   Every marker below opens something that is not the sentence: a new line, a
   bracketed pronunciation or gloss, another language's heading, a JSON key,
   an arrow, or a word the model uses when it starts talking to itself. The
   earliest one wins and everything from there is dropped.
   ========================================================= */

/*
 * A newline never belongs in an example. One sentence is the whole contract,
 * and every one of the 1,989 stored examples that is a sentence is on one
 * line; a second line is always the model having moved on to something else.
 */
const ALWAYS_ENDS_IT = /\n/;

/*
 * These only apply to a sentence written in CJK, and that restriction is not
 * caution — it is the difference between repairing and damaging.
 *
 * Every marker here is an English word or an English-language heading. In a
 * Chinese sentence those are the model talking about its own answer. In an
 * English one they are the answer: "Grab your keys, let's go!" is a correct
 * example for "let's go", and a dry run over the live library cut it to
 * "Grab your keys," before this was scoped. All 20 of the over-long rows are
 * Chinese and the longest English example in the library is 116 characters,
 * so there is nothing here to repair outside CJK and 1,525 Latin-script rows
 * to protect.
 */
const ENDS_A_CJK_SENTENCE = [
  /\*?\s*(?:English|Spanish|French|Italian|Chinese|Traditional Chinese)\s*:/i,
  /'(?:en|es|fr|it|zh-TW)'\s*:/,
  /\s->\s/,
  /\s?\[/,
  /\s(?:Wait|Actually|Correction|Note|Okay|Perfect)\b[,.:]/i,
  /\bLet's\s/i,
];

/* Every bracket group, so one can be judged by what is inside it. */
const BRACKET_GROUP = /[（(][^）)]*[）)]/g;

/**
 * The sentence, with anything the model added after it removed.
 *
 * Returns undefined when nothing usable is left, so the field stays unset and
 * the card shows no example rather than a blank line or a paragraph of
 * English. Deliberately keeps whatever came *before* the first marker: in
 * every polluted row inspected the opening sentence is correct and complete,
 * so cutting recovers it where discarding the row would lose it.
 *
 * Brackets are judged rather than cut at. "Il est arrivé en retard (comme
 * toujours) à la réunion" is an ordinary French sentence and its parenthesis
 * is the writer's; inside a Chinese sentence a bracket holding Latin is a
 * pronunciation or a gloss and the sentence has ended, while （不是台中）is
 * part of what is being said.
 */
export function cleanExampleSentence(example: string | undefined | null) {
  const text = example?.trim();
  if (!text) return undefined;

  let cut = text.length;

  const newline = text.search(ALWAYS_ENDS_IT);
  if (newline > 0) cut = newline;

  if (CJK.test(text)) {
    for (const marker of ENDS_A_CJK_SENTENCE) {
      const found = text.search(marker);
      if (found > 0 && found < cut) cut = found;
    }

    for (const match of text.matchAll(BRACKET_GROUP)) {
      if (match.index === undefined || match.index === 0) continue;
      if (!LATIN_ISH.test(match[0].slice(1, -1))) continue;
      if (match.index < cut) cut = match.index;
      break;
    }
  }

  return stripRomanisation(text.slice(0, cut));
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
