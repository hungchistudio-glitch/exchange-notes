import { GoogleGenAI } from "@google/genai";

/**
 * Daily News generation, redesigned to NOT depend on Gemini's Google Search
 * grounding tool. As of late 2025 / 2026, Google appears to require a
 * billing account linked to the Google Cloud project before grounding will
 * work at all — even brand-new, unused projects get an immediate 429
 * RESOURCE_EXHAUSTED the moment the `google_search` tool is attached, while
 * plain (non-grounded) generation on the same key works fine. Rather than
 * ask the user to link a credit card just to keep this feature, we get real,
 * dated news articles from The Guardian's free Open Platform API (no
 * billing required, explicitly permits non-commercial production use) and
 * use Gemini ONLY for the bilingual rewriting/translation/vocabulary work —
 * a plain text-in/text-out call with no tools attached, which stays on the
 * normal free-tier budget we've already confirmed works.
 *
 * This also improves trustworthiness versus the old design: the source URL,
 * source name, and publish date now come directly from The Guardian's API
 * response instead of being regurgitated by the model, so they can never be
 * hallucinated or point to the wrong article.
 *
 * Still only ever called from the scheduled cron job — see
 * app/api/cron/daily-news/route.ts. Never call this from a route that runs
 * on a user page load.
 */

export type VocabularyItem = {
  word: string;
  translation: string;
  partOfSpeech: string;
  englishExample: string;
  chineseExample: string;
};

export type DailyNewsCard = {
  id: string;
  category: string;
  englishTitle: string;
  chineseTitle: string;
  englishSummary: string;
  chineseSummary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  vocabulary: VocabularyItem[];
  // Straight from Guardian's own thumbnail field — never AI-generated, so
  // it's never a hallucinated image. Null when Guardian doesn't have one
  // for that article (common for text-only pieces).
  imageUrl: string | null;
  // Gemini has no vision access to the actual photo, so this is
  // deliberately NOT "a description of what's in the photo" — see the
  // prompt instructions below for why it's scoped to scene/context only.
  englishCaption: string | null;
  chineseCaption: string | null;
};

type GuardianArticle = {
  category: string;
  title: string;
  url: string;
  publishedAt: string;
  excerpt: string;
  imageUrl: string | null;
};

type LearningItem = {
  englishTitle: string;
  chineseTitle: string;
  englishSummary: string;
  chineseSummary: string;
  vocabulary: VocabularyItem[];
  englishCaption: string;
  chineseCaption: string;
};

type GeminiLearningResponse = {
  cards: LearningItem[];
};

const ALLOWED_PARTS_OF_SPEECH = new Set([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "phrase",
]);

// One Guardian section per slot. Kept small and diverse rather than trying
// to replicate the old 5-region (US/Taiwan/international/Europe/culture)
// design, since a single-publisher source can't credibly claim that kind of
// geographic breadth. Maps cleanly onto the category labels already used in
// the UI.
const GUARDIAN_SECTIONS: { section: string; category: string }[] = [
  { section: "world", category: "World" },
  { section: "business", category: "Business" },
  { section: "technology", category: "Technology" },
  { section: "science", category: "Science" },
  { section: "culture", category: "Culture" },
];

const MINIMUM_BODY_LENGTH = 300;
const EXCERPT_BODY_LENGTH = 1200;

function normalizeText(value: unknown, maximumLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maximumLength);
}

function normalizeMultilineText(value: unknown, maximumLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maximumLength);
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function createStableId(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function stripJsonCodeFence(value: string) {
  return value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

type GuardianApiFields = {
  trailText?: string;
  bodyText?: string;
  thumbnail?: string;
};

type GuardianApiResult = {
  id: string;
  type: string;
  webTitle: string;
  webUrl: string;
  webPublicationDate: string;
  fields?: GuardianApiFields;
};

async function fetchGuardianArticle(
  section: string,
  category: string,
  apiKey: string
): Promise<GuardianArticle | null> {
  const url = new URL("https://content.guardianapis.com/search");
  url.searchParams.set("section", section);
  url.searchParams.set("order-by", "newest");
  url.searchParams.set("page-size", "5");
  url.searchParams.set("show-fields", "trailText,bodyText,thumbnail");
  url.searchParams.set("api-key", apiKey);

  const response = await fetch(url.toString(), {
    // The cron job already runs on a schedule; no need for Next.js's own
    // data cache on top of that.
    cache: "no-store",
  });

  if (!response.ok) {
    console.error(
      `Guardian API request failed for section "${section}": ${response.status}`
    );
    return null;
  }

  const data = (await response.json()) as {
    response?: { results?: GuardianApiResult[] };
  };

  const results = data.response?.results ?? [];

  for (const result of results) {
    if (result.type !== "article") {
      continue;
    }

    const bodyText = stripHtml(result.fields?.bodyText ?? "");

    if (bodyText.length < MINIMUM_BODY_LENGTH) {
      continue;
    }

    const trailText = stripHtml(result.fields?.trailText ?? "");

    return {
      category,
      title: normalizeText(result.webTitle, 200),
      url: result.webUrl,
      publishedAt: result.webPublicationDate,
      excerpt: [trailText, bodyText.slice(0, EXCERPT_BODY_LENGTH)]
        .filter(Boolean)
        .join("\n\n"),
      imageUrl:
        typeof result.fields?.thumbnail === "string" &&
        result.fields.thumbnail.trim()
          ? result.fields.thumbnail.trim()
          : null,
    };
  }

  return null;
}

function validateVocabularyItem(value: unknown): VocabularyItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  const word = normalizeText(candidate.word, 45);
  const translation = normalizeText(candidate.translation, 40);
  const partOfSpeech = normalizeText(candidate.partOfSpeech, 20);
  const englishExample = normalizeMultilineText(candidate.englishExample, 180);
  const chineseExample = normalizeMultilineText(candidate.chineseExample, 130);

  if (
    !word ||
    !translation ||
    !ALLOWED_PARTS_OF_SPEECH.has(partOfSpeech) ||
    !englishExample ||
    !chineseExample
  ) {
    return null;
  }

  return { word, translation, partOfSpeech, englishExample, chineseExample };
}

function validateLearningItem(value: unknown): LearningItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  const englishTitle = normalizeText(candidate.englishTitle, 120);
  const chineseTitle = normalizeText(candidate.chineseTitle, 80);
  const englishSummary = normalizeMultilineText(candidate.englishSummary, 320);
  const chineseSummary = normalizeMultilineText(candidate.chineseSummary, 220);
  const englishCaption = normalizeText(candidate.englishCaption, 90);
  const chineseCaption = normalizeText(candidate.chineseCaption, 60);

  const rawVocabulary = Array.isArray(candidate.vocabulary)
    ? candidate.vocabulary
    : [];

  const vocabulary = rawVocabulary
    .map(validateVocabularyItem)
    .filter((item): item is VocabularyItem => item !== null)
    .slice(0, 3);

  if (
    !englishTitle ||
    !chineseTitle ||
    !englishSummary ||
    !chineseSummary ||
    !englishCaption ||
    !chineseCaption ||
    vocabulary.length !== 3
  ) {
    return null;
  }

  return {
    englishTitle,
    chineseTitle,
    englishSummary,
    chineseSummary,
    vocabulary,
    englishCaption,
    chineseCaption,
  };
}

function buildLearningSchema(count: number) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      cards: {
        type: "array",
        minItems: count,
        maxItems: count,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            englishTitle: { type: "string", minLength: 8, maxLength: 120 },
            chineseTitle: { type: "string", minLength: 4, maxLength: 80 },
            englishSummary: { type: "string", minLength: 40, maxLength: 320 },
            chineseSummary: { type: "string", minLength: 20, maxLength: 220 },
            englishCaption: { type: "string", minLength: 8, maxLength: 90 },
            chineseCaption: { type: "string", minLength: 4, maxLength: 60 },
            vocabulary: {
              type: "array",
              minItems: 3,
              maxItems: 3,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  word: { type: "string", minLength: 2, maxLength: 45 },
                  translation: {
                    type: "string",
                    minLength: 1,
                    maxLength: 40,
                  },
                  partOfSpeech: {
                    type: "string",
                    enum: ["noun", "verb", "adjective", "adverb", "phrase"],
                  },
                  englishExample: {
                    type: "string",
                    minLength: 10,
                    maxLength: 180,
                  },
                  chineseExample: {
                    type: "string",
                    minLength: 5,
                    maxLength: 130,
                  },
                },
                required: [
                  "word",
                  "translation",
                  "partOfSpeech",
                  "englishExample",
                  "chineseExample",
                ],
              },
            },
          },
          required: [
            "englishTitle",
            "chineseTitle",
            "englishSummary",
            "chineseSummary",
            "englishCaption",
            "chineseCaption",
            "vocabulary",
          ],
        },
      },
    },
    required: ["cards"],
  } as const;
}

function createLearningPrompt(articles: GuardianArticle[]) {
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
You are building a bilingual (English / Traditional Chinese) vocabulary
lesson from ${articles.length} real news articles published by The Guardian.
Use ONLY the facts, names, and numbers stated in each excerpt below. Do not
invent or add any detail, quote, or claim that is not present in the given
text.

${articleBlocks}

For EACH article above, in the same order, produce:
- englishTitle: a clear, natural CEFR B1-B2 English headline. You may
  lightly simplify difficult vocabulary from the original headline, but the
  meaning must stay the same.
- chineseTitle: a natural Traditional Chinese translation as used in Taiwan.
- englishSummary: a concise 2-3 sentence English summary using only facts
  present in the excerpt.
- chineseSummary: an accurate Traditional Chinese translation of that
  summary.
- vocabulary: exactly 3 useful CEFR B1-B2 English vocabulary items drawn
  from the headline or excerpt. For each: give its Traditional Chinese
  meaning, its part of speech, one original English example sentence, and
  that example's Traditional Chinese translation. Examples must not
  introduce new claims about the article.
- englishCaption: a short one-line caption (max ~12 words) that could sit
  beneath a generic editorial photo illustrating this story's general
  topic or setting (e.g. "Demonstrators gather in a city square" for a
  protest story). You have NOT seen the actual photo, so do not claim to
  describe specific visual details, people, or exact numbers — only the
  general scene/context implied by the story's subject matter.
- chineseCaption: a natural Traditional Chinese translation of
  englishCaption.

Return exactly ${articles.length} cards, in the same order as the articles
above, matching the required JSON schema.
`.trim();
}

/**
 * Fetches real articles from The Guardian's free Open Platform API, then
 * makes exactly one (non-grounded) Gemini call to produce bilingual
 * learning content for them. Throws on any failure — callers (the cron
 * route) are responsible for catching and reporting errors.
 */
export async function generateDailyNews(): Promise<{
  cards: DailyNewsCard[];
  generatedAt: string;
}> {
  const guardianApiKey = process.env.GUARDIAN_API_KEY;

  if (!guardianApiKey) {
    throw new Error("GUARDIAN_API_KEY is not configured on the server.");
  }

  const articles = (
    await Promise.all(
      GUARDIAN_SECTIONS.map((entry) =>
        fetchGuardianArticle(entry.section, entry.category, guardianApiKey)
      )
    )
  ).filter((article): article is GuardianArticle => article !== null);

  if (articles.length === 0) {
    throw new Error(
      "The Guardian API did not return any usable articles today."
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";

  const client = new GoogleGenAI({ apiKey });

  // Deliberately no `tools` field here — this call never touches Google
  // Search grounding, so it only ever draws on the normal (non-grounded)
  // Gemini free tier, which we've confirmed works reliably with this key.
  const interaction = await client.interactions.create({
    model,
    input: createLearningPrompt(articles),
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: buildLearningSchema(articles.length),
    },
    generation_config: {
      thinking_level: "low",
    },
    store: false,
  });

  const outputText =
    typeof interaction.output_text === "string"
      ? interaction.output_text
      : "";

  if (!outputText.trim()) {
    throw new Error("Gemini returned an empty response.");
  }

  const parsed = JSON.parse(
    stripJsonCodeFence(outputText)
  ) as GeminiLearningResponse;

  const rawLearningItems = Array.isArray(parsed.cards) ? parsed.cards : [];

  const cards: DailyNewsCard[] = [];

  articles.forEach((article, index) => {
    const learning = validateLearningItem(rawLearningItems[index]);

    if (!learning) {
      return;
    }

    cards.push({
      id: createStableId(article.url),
      category: article.category,
      englishTitle: learning.englishTitle,
      chineseTitle: learning.chineseTitle,
      englishSummary: learning.englishSummary,
      chineseSummary: learning.chineseSummary,
      sourceName: "The Guardian",
      sourceUrl: article.url,
      publishedAt: article.publishedAt,
      vocabulary: learning.vocabulary,
      imageUrl: article.imageUrl,
      englishCaption: learning.englishCaption,
      chineseCaption: learning.chineseCaption,
    });
  });

  if (cards.length === 0) {
    throw new Error(
      "Gemini did not return any valid learning content for today's articles."
    );
  }

  return {
    cards,
    generatedAt: new Date().toISOString(),
  };
}
