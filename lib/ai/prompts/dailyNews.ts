import {
  promptLanguageName,
  whenFieldNamesMislead,
  whenScriptRuleApplies,
} from "@/lib/ai/languagePrompt";
import { DEFAULT_LEARNING_PAIR, type LanguageCode } from "@/lib/languages";

/** Just the fields the prompt reads, so this module does not pull in the feed. */
export type PromptArticle = {
  category: string;
  title: string;
  excerpt: string;
};

export function buildDailyNewsPrompt(
  articles: PromptArticle[],
  [first, second]: readonly [LanguageCode, LanguageCode] = DEFAULT_LEARNING_PAIR,
) {
  const firstName = promptLanguageName(first);
  const secondName = promptLanguageName(second);

  // "as used in Taiwan" is a locale rule for Chinese, not a general one —
  // conditional rather than dropped.
  const localeNote = whenScriptRuleApplies([first, second], " as used in Taiwan");

  const fieldNote = whenFieldNamesMislead([first, second], `\n\nThe card fields are named englishTitle, chineseTitle, englishSummary,
chineseSummary, englishCaption and chineseCaption for historical reasons;
those names do not describe this request. Every "english" field holds the
${firstName} side and every "chinese" field holds the ${secondName} side. Answer only in the two languages named above.`);

  const scriptRule = whenScriptRuleApplies(
    [first, second],
    `

Every Chinese string above must use Traditional characters as written in
Taiwan. Never return a Simplified character, including in vocabulary meanings
and example translations.`,
  );

  const articleBlocks = articles
    .map(
      (article, index) => `
Article ${index + 1} (category: ${article.category}):
Headline: ${article.title}
Excerpt: ${article.excerpt}
`.trim()
    )
    .join("\n\n---\n\n");

  return `
You are building a bilingual (${firstName} / ${secondName}) vocabulary
lesson from ${articles.length} real news articles published by The Guardian.
Use ONLY the facts, names, and numbers stated in each excerpt below. Do not
invent or add any detail, quote, or claim that is not present in the given
text.

${articleBlocks}

For EACH article above, in the same order, produce:
- englishTitle: a clear, natural CEFR B1-B2 ${firstName} headline. You may
  lightly simplify difficult vocabulary from the original headline, but the
  meaning must stay the same.
- chineseTitle: a natural ${secondName} translation${localeNote}.
- englishSummary: a concise 2-3 sentence ${firstName} summary using only facts
  present in the excerpt.
- chineseSummary: an accurate ${secondName} translation of that
  summary.
- vocabulary: exactly 3 useful CEFR B1-B2 ${firstName} vocabulary items drawn
  from the headline or excerpt. For each: give its ${secondName}
  meaning, its part of speech, one original ${firstName} example sentence, and
  that example's ${secondName} translation. Examples must not
  introduce new claims about the article.
- englishCaption: a short one-line caption (max ~12 words) that could sit
  beneath a generic editorial photo illustrating this story's general
  topic or setting (e.g. "Demonstrators gather in a city square" for a
  protest story). You have NOT seen the actual photo, so do not claim to
  describe specific visual details, people, or exact numbers — only the
  general scene/context implied by the story's subject matter.
- chineseCaption: a natural ${secondName} translation of
  englishCaption.${scriptRule}

Return exactly ${articles.length} cards, in the same order as the articles
above, matching the required JSON schema.${fieldNote}
`.trim();
}
