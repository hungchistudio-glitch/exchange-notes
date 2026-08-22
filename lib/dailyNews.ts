import { buildDailyNewsPrompt } from "@/lib/ai/prompts/dailyNews";
import {
  DEFAULT_LEARNING_PAIR,
  compactByLanguage,
} from "@/lib/languages";
import type { DailyNewsCard, VocabularyItem } from "@/lib/types/dailyNews";
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

export type { DailyNewsCard, VocabularyItem } from "@/lib/types/dailyNews";

const [FIRST_CODE, SECOND_CODE] = DEFAULT_LEARNING_PAIR;

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

/*
 * The daily slate.
 *
 * Twelve slots rather than five, because the feed is now a pool the reader
 * draws from over days instead of a batch replaced every morning — see the
 * daily_news_pool migration. Twelve a day against a fourteen-day retention
 * settles at roughly a hundred and seventy cards, which is more than any
 * reader gets through, so "show me something I have not read" always has an
 * answer.
 *
 * All of them are Guardian sections, which is the only free source measured
 * to give full body text under terms that permit this use. Twelve sections
 * cost twelve API calls a day against a five-hundred-a-day free allowance.
 *
 * A slot may also be a query rather than a section. Taiwan is the reason:
 * the Guardian has no Taiwan section, and the tag carries roughly two
 * articles a week — measured, not assumed. Asking for more Taiwan slots than
 * that would not produce more Taiwan news, it would produce the same two
 * articles again, and the pool's unique constraint on source_url would
 * reject them anyway. So Taiwan takes one slot and the pool takes whatever
 * genuinely new Taiwan coverage exists on the day; on days with none the
 * slot simply yields nothing and the other eleven still land.
 *
 * Raising Taiwan's share needs a Taiwan source, not a bigger number here.
 * Taipei Times publishes fifty headlines a day with no body text in its feed
 * and disallows AI crawlers outright in robots.txt; NewsAPI's free tier is
 * licensed for development only. Neither is usable, which is why this list
 * looks the way it does.
 */
type NewsSlot = {
  category: string;
  /** A Guardian section, for the general-interest slots. */
  section?: string;
  /** A free-text query, for subjects the Guardian files under no section. */
  query?: string;
  /*
   * Words the headline must contain for a query slot's result to count.
   *
   * A free-text search matches the body, so `q=Taiwan` returns anything that
   * mentions Taiwan once in passing — the first run of this pulled an
   * Australian daily briefing about GST reform into the Taiwan category
   * because the digest happened to name Taiwan somewhere in the middle. A
   * card filed under Taiwan that is about Australian tax policy is worse
   * than no Taiwan card at all, so the headline has to be about the subject
   * too, not merely the article.
   */
  headlineMustMention?: string[];
};

const NEWS_SLOTS: NewsSlot[] = [
  { section: "world", category: "World" },
  { section: "business", category: "Business" },
  { section: "technology", category: "Technology" },
  { section: "science", category: "Science" },
  { section: "culture", category: "Culture" },
  { section: "environment", category: "Environment" },
  { section: "society", category: "Society" },
  { section: "global-development", category: "Development" },
  { section: "education", category: "Education" },
  { section: "film", category: "Film" },
  { section: "books", category: "Books" },
  {
    query: "Taiwan",
    category: "Taiwan",
    headlineMustMention: ["taiwan", "taipei", "taiwanese"],
  },
];

/*
 * How many candidates to pull per slot.
 *
 * More than one, because the freshest article in a section is often one the
 * pool already holds — the Guardian's "newest in business" does not change
 * every twenty-four hours. Eight gives the caller room to skip past what it
 * has already ingested without a second round trip, and costs nothing extra:
 * it is the same single request either way.
 */
const CANDIDATES_PER_SLOT = 8;

/*
 * How many articles go into one Gemini call.
 *
 * The cron job runs on Vercel's Hobby plan, where a function is killed at
 * sixty seconds and cannot be raised. One call carrying all twelve articles
 * is the version that risks that ceiling; two calls of six run in parallel
 * and finish in roughly half the wall time for the same tokens. Well inside
 * the free tier's request-per-minute allowance either way.
 */
const ARTICLES_PER_BATCH = 6;

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

/**
 * Every usable article a slot currently offers, freshest first.
 *
 * Returns a list rather than a single article so the caller can skip the
 * ones already in the pool without asking the Guardian again. A slot that
 * yields nothing usable returns an empty array rather than throwing: on any
 * given day the Taiwan query legitimately has no new coverage, and one empty
 * slot must not cost the other eleven their run.
 */
async function fetchSlotCandidates(
  slot: NewsSlot,
  apiKey: string
): Promise<GuardianArticle[]> {
  const url = new URL("https://content.guardianapis.com/search");

  if (slot.section) {
    url.searchParams.set("section", slot.section);
  }

  if (slot.query) {
    url.searchParams.set("q", slot.query);
  }

  url.searchParams.set("order-by", "newest");
  url.searchParams.set("page-size", String(CANDIDATES_PER_SLOT));
  url.searchParams.set("show-fields", "trailText,bodyText,thumbnail");
  url.searchParams.set("api-key", apiKey);

  const response = await fetch(url.toString(), {
    // The cron job already runs on a schedule; no need for Next.js's own
    // data cache on top of that.
    cache: "no-store",
  });

  if (!response.ok) {
    console.error(
      `Guardian API request failed for slot "${slot.category}": ${response.status}`
    );
    return [];
  }

  const data = (await response.json()) as {
    response?: { results?: GuardianApiResult[] };
  };

  const results = data.response?.results ?? [];
  const articles: GuardianArticle[] = [];

  for (const result of results) {
    if (result.type !== "article") {
      continue;
    }

    if (slot.headlineMustMention) {
      const headline = (result.webTitle ?? "").toLowerCase();

      if (!slot.headlineMustMention.some((term) => headline.includes(term))) {
        continue;
      }
    }

    const bodyText = stripHtml(result.fields?.bodyText ?? "");

    if (bodyText.length < MINIMUM_BODY_LENGTH) {
      continue;
    }

    const trailText = stripHtml(result.fields?.trailText ?? "");

    articles.push({
      category: slot.category,
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
    });
  }

  return articles;
}

function validateVocabularyItem(value: unknown): VocabularyItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  const word = normalizeText(candidate.word, 45);
  const translation = normalizeText(candidate.translation, 40);
  const partOfSpeech = normalizeText(candidate.partOfSpeech, 20);
  const firstExample = normalizeMultilineText(candidate.englishExample, 180);
  const secondExample = normalizeMultilineText(candidate.chineseExample, 130);

  if (
    !word ||
    !translation ||
    !ALLOWED_PARTS_OF_SPEECH.has(partOfSpeech) ||
    !firstExample ||
    !secondExample
  ) {
    return null;
  }

  return {
    word,
    translation,
    partOfSpeech,
    examples: compactByLanguage({
      [FIRST_CODE]: firstExample,
      [SECOND_CODE]: secondExample,
    }),
  };
}

function validateLearningItem(value: unknown): LearningItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  /*
   * The model answers in fields named for two languages, because that is its
   * schema. Which languages they hold is set by the pair the prompt was built
   * with — see buildDailyNewsPrompt — so the mapping happens here and nothing
   * downstream reads a language out of a field name.
   */
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


/** One card, with the article it came from — what the pool stores. */
export type DailyNewsPoolItem = {
  card: DailyNewsCard;
  category: string;
  sourceUrl: string;
  publishedAt: string;
};

/**
 * Picks today's articles, one per slot, skipping anything already ingested.
 *
 * The dedupe happens here rather than after generation, and that ordering is
 * the point: a repeat article that reached Gemini would spend tokens
 * producing a card the pool then rejects on its unique constraint. Asking
 * `isIngested` first means a slow news day costs one Guardian request and
 * nothing else.
 */
export async function selectTodaysArticles(
  isIngested: (url: string) => boolean
): Promise<GuardianArticle[]> {
  const guardianApiKey = process.env.GUARDIAN_API_KEY;

  if (!guardianApiKey) {
    throw new Error("GUARDIAN_API_KEY is not configured on the server.");
  }

  const candidateLists = await Promise.all(
    NEWS_SLOTS.map((slot) => fetchSlotCandidates(slot, guardianApiKey))
  );

  const chosen: GuardianArticle[] = [];
  const takenThisRun = new Set<string>();

  for (const candidates of candidateLists) {
    // A query slot and a section slot can surface the same article — the
    // Taiwan query returns whatever section that story was filed under — so
    // this run's own picks are checked alongside the pool's.
    const pick = candidates.find(
      (article) => !isIngested(article.url) && !takenThisRun.has(article.url)
    );

    if (!pick) continue;

    takenThisRun.add(pick.url);
    chosen.push(pick);
  }

  return chosen;
}

async function buildLearningBatch(
  articles: GuardianArticle[],
  model: string,
  client: GoogleGenAI
): Promise<DailyNewsPoolItem[]> {
  // Deliberately no `tools` field here — this call never touches Google
  // Search grounding, so it only ever draws on the normal (non-grounded)
  // Gemini free tier.
  const interaction = await client.interactions.create({
    model,
    input: buildDailyNewsPrompt(articles),
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
    typeof interaction.output_text === "string" ? interaction.output_text : "";

  if (!outputText.trim()) {
    throw new Error("Gemini returned an empty response.");
  }

  const parsed = JSON.parse(
    stripJsonCodeFence(outputText)
  ) as GeminiLearningResponse;

  const rawLearningItems = Array.isArray(parsed.cards) ? parsed.cards : [];

  const items: DailyNewsPoolItem[] = [];

  articles.forEach((article, index) => {
    const learning = validateLearningItem(rawLearningItems[index]);

    if (!learning) return;

    items.push({
      category: article.category,
      sourceUrl: article.url,
      publishedAt: article.publishedAt,
      card: {
        id: article.url,
        category: article.category,
        titles: compactByLanguage({
          [FIRST_CODE]: learning.englishTitle,
          [SECOND_CODE]: learning.chineseTitle,
        }),
        summaries: compactByLanguage({
          [FIRST_CODE]: learning.englishSummary,
          [SECOND_CODE]: learning.chineseSummary,
        }),
        captions: compactByLanguage({
          [FIRST_CODE]: learning.englishCaption,
          [SECOND_CODE]: learning.chineseCaption,
        }),
        vocabulary: learning.vocabulary,
        imageUrl: article.imageUrl,
        sourceName: "The Guardian",
        sourceUrl: article.url,
        publishedAt: article.publishedAt,
      },
    });
  });

  return items;
}

/**
 * Turns chosen articles into pool items.
 *
 * Split into parallel batches because the cron job runs on Vercel's Hobby
 * plan, where sixty seconds is a hard ceiling that cannot be raised: two
 * calls of six finish in roughly half the wall time of one call of twelve,
 * for the same number of tokens.
 *
 * A batch that fails does not take the others down. Losing six cards on a
 * day the model hiccups is a thinner pool; losing all twelve because one
 * request failed is a day with no news at all.
 */
export async function buildLearningCards(
  articles: GuardianArticle[]
): Promise<DailyNewsPoolItem[]> {
  if (articles.length === 0) return [];

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
  const client = new GoogleGenAI({ apiKey });

  const batches: GuardianArticle[][] = [];
  for (let i = 0; i < articles.length; i += ARTICLES_PER_BATCH) {
    batches.push(articles.slice(i, i + ARTICLES_PER_BATCH));
  }

  const settled = await Promise.allSettled(
    batches.map((batch) => buildLearningBatch(batch, model, client))
  );

  const items: DailyNewsPoolItem[] = [];

  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      items.push(...result.value);
      return;
    }

    console.error(
      `Daily news batch ${index + 1}/${batches.length} failed:`,
      result.reason
    );
  });

  return items;
}
