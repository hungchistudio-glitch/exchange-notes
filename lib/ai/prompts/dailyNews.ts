import {
  promptLanguageName,
  whenScriptRuleApplies,
} from "@/lib/ai/languagePrompt";
import { exampleSentenceRules } from "@/lib/ai/prompts/exampleSentence";
import { DEFAULT_LEARNING_PAIR, type LanguageCode } from "@/lib/languages";

/** Just the fields the prompt reads, so this module does not pull in the feed. */
export type PromptArticle = {
  category: string;
  title: string;
  excerpt: string;
};

/**
 * One lesson per article, written in every language the pool serves.
 *
 * The pool is shared: one batch a day for everybody. So a card is not written
 * for a pair — it is written in each language separately, and each reader
 * takes the two they need out of it. That is what lets someone learning
 * Spanish read the same story someone learning English is reading, in their
 * own language, from the same row.
 */
export function buildDailyNewsPrompt(
  articles: PromptArticle[],
  languages: readonly LanguageCode[] = DEFAULT_LEARNING_PAIR,
) {
  const named = languages.map(promptLanguageName);
  const list = named.map((name, index) => `${index + 1}. ${name}`).join("\n");
  const keys = languages.map((code) => `"${code}"`).join(", ");

  // "As used in Taiwan" is a locale rule for Chinese, not a general one —
  // conditional rather than dropped.
  const localeNote = whenScriptRuleApplies(languages, " as used in Taiwan");

  const scriptRule = whenScriptRuleApplies(
    languages,
    `

Every Chinese string must use Traditional characters as written in Taiwan.
Never return a Simplified character, including in vocabulary meanings and
example translations.`,
  );

  const articleBlocks = articles
    .map(
      (article, index) => `
Article ${index + 1} (category: ${article.category}):
Headline: ${article.title}
Excerpt: ${article.excerpt}
`.trim(),
    )
    .join("\n\n---\n\n");

  return `
You are building a vocabulary lesson from ${articles.length} real news
articles published by The Guardian, for readers who between them are learning
these languages:

${list}

Where you are describing an article — its title, summary and caption — use
ONLY the facts, names, and numbers stated in its excerpt below. Do not invent
or add any detail, quote, or claim that is not present in the given text.
(The vocabulary examples are not descriptions of the article; see below.)

${articleBlocks}

For EACH article above, in the same order, produce:
- titles: the headline in every language listed, keyed by ${keys}. Each is a
  clear, natural CEFR B1-B2 headline in that language${localeNote}. You may
  lightly simplify difficult vocabulary, but the meaning must stay the same,
  and all of them must say the same thing.
- summaries: a concise 2-3 sentence summary in every language listed, keyed
  the same way, using only facts present in the excerpt.
- captions: a short one-line caption (max ~12 words) in every language listed,
  for a generic editorial photo illustrating this story's general topic or
  setting (e.g. "Demonstrators gather in a city square" for a protest story).
  You have NOT seen the actual photo, so do not claim to describe specific
  visual details, people, or exact numbers.
- vocabulary: exactly 3 useful CEFR B1-B2 words drawn from the headline or
  excerpt. For each: "texts" is that word in every language listed, keyed the
  same way; "partOfSpeech" is one of the allowed values; "examples" is one
  sentence per language, each using that language's own form of the word.

  The examples are the one part of this card that is not about the article.
  The word is what the reader keeps; the story is only where they happened to
  meet it. Write each sentence for the word, set anywhere, and do not carry
  the article's people, events or register into it — a sentence that only
  makes sense to someone who read this story is a sentence the reader can
  never reuse. This is not licence to invent anything about the article: the
  example simply must not be about it.
${exampleSentenceRules({ indent: "  " })}

Every language listed gets its own real writing, not a word-for-word
transliteration of another one. A reader of any of them should find a story
written for them rather than a translation showing through.${scriptRule}

Return exactly ${articles.length} cards, in the same order as the articles
above, matching the required JSON schema.
`.trim();
}
