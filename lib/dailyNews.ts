import { buildDailyNewsPrompt } from "@/lib/ai/prompts/dailyNews";
import {
  DEFAULT_LEARNING_PAIR,
  type ByLanguage,
  type LanguageCode,
} from "@/lib/languages";
import type { DailyNewsCard, VocabularyItem } from "@/lib/types/dailyNews";
import { GoogleGenAI } from "@google/genai";

import { askText } from "@/lib/ai/askText";
/** Real publisher metadata and excerpts, followed by multilingual lessons.
 * Generated only by cron/background refill, never while a reader waits.
 */
export type { DailyNewsCard, VocabularyItem } from "@/lib/types/dailyNews";
import { NEWS_SLOTS, type NewsArticle, type NewsSlot } from "@/lib/news/sources";
import { fetchRssArticles } from "@/lib/news/rss";
import { hasAdvancedVocabularyDiversity, isNewsSourceAnchor } from "@/lib/news/vocabulary";
import { toTraditional } from "@/lib/chinese/toTraditional";

type LearningItem = {
  titles: ByLanguage;
  summaries: ByLanguage;
  captions: ByLanguage;
  vocabulary: VocabularyItem[];
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
 * is the version that risks that ceiling, so the work is split.
 *
 * How far it is split stopped being a decision anyone made. This was written
 * for two languages, where twelve articles became two calls of six — and the
 * note that used to live here said that was "well inside the free tier's
 * request-per-minute allowance", which it was. Then the pool grew to five
 * languages, articlesPerBatch shrank the batch to keep each response the
 * same size, and two calls quietly became six. Nobody re-read this sentence.
 *
 * Six was not inside the allowance. Gemini's free tier answered with 429s
 * asking for a fifty-one second wait, which is longer than the whole function
 * is allowed to live, and batches 1, 2 and 4 were simply lost. The days it
 * produced nothing at all are in daily_news_items: 09-05 through 09-07, and
 * 09-09.
 *
 * So the floor is three rather than two. Five languages now means four calls
 * instead of six, at fifteen article-languages per response against the
 * twelve this was measured with — inside the budget dailyNewsBatch asserts,
 * and inside the request allowance that six was not.
 */
const ARTICLES_PER_BATCH = 6;

/**
 * The fewest articles a call may carry.
 *
 * Raising it lowers the number of requests, which is the thing the free tier
 * counts. Lowering it below three brings back the six-call day.
 */
const MINIMUM_ARTICLES_PER_BATCH = 3;

/**
 * Articles per request, held so the output per request does not grow with
 * the language count.
 *
 * Every extra language multiplies what a single call has to write: a title,
 * a summary, a caption and three words with examples, again. Six articles in
 * two languages and six in five are not the same request, and the cron runs
 * on Vercel's Hobby plan where sixty seconds is a hard ceiling. Batches run
 * in parallel and a failed one only costs its own cards, so more, smaller
 * requests is the cheaper way to be wrong.
 *
 * Floored at two: a batch of one loses the shared article context that makes
 * the model's vocabulary picks differ from card to card.
 */
export function articlesPerBatch(languageCount: number): number {
  const budget = ARTICLES_PER_BATCH * DEFAULT_LEARNING_PAIR.length;
  return Math.max(
    MINIMUM_ARTICLES_PER_BATCH,
    Math.min(ARTICLES_PER_BATCH, Math.round(budget / Math.max(1, languageCount))),
  );
}

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
): Promise<NewsArticle[]> {
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
    signal: AbortSignal.timeout(6_000),
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
  const articles: NewsArticle[] = [];

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
      sourceName: "The Guardian",
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

function validateVocabularyItem(
  value: unknown,
  languages: readonly LanguageCode[],
  sourceText: string,
): VocabularyItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  const texts = readLanguageMap(candidate.texts, 45, languages);
  const examples = readLanguageMap(candidate.examples, 180, languages);
  const partOfSpeech = normalizeText(candidate.partOfSpeech, 20);
  const sourceAnchor = normalizeText(candidate.sourceAnchor, 121).toLowerCase();

  // Every language the pool covers, or the word is not usable: a card that
  // teaches three languages and can only name the word in two of them leaves
  // one reader looking at a blank.
  if (
    !ALLOWED_PARTS_OF_SPEECH.has(partOfSpeech) ||
    !isNewsSourceAnchor(sourceAnchor, sourceText) ||
    languages.some((language) => !texts[language] || !examples[language])
  ) {
    return null;
  }

  return { texts, examples, partOfSpeech };
}

/**
 * Reads one of the model's language-keyed objects.
 *
 * Absent and empty are the same answer here — a language with nothing in it
 * is a language the card does not carry — so the result never holds a blank
 * string for a reader to be shown.
 */
function readLanguageMap(
  value: unknown,
  maxLength: number,
  languages: readonly LanguageCode[],
): ByLanguage {
  if (!value || typeof value !== "object") return {};

  const record = value as Record<string, unknown>;
  const out: ByLanguage = {};

  for (const language of languages) {
    const text = normalizeMultilineText(record[language], maxLength);
    if (text) out[language] = language === "zh-TW" ? toTraditional(text) : text;
  }

  return out;
}

function validateLearningItem(
  value: unknown,
  languages: readonly LanguageCode[],
  article: NewsArticle,
): LearningItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  /*
   * Read by language rather than by field name. The model answers in maps
   * now, one entry per language the pool serves, so nothing here has to know
   * which two languages a card "really" is — there is no such pair any more.
   */
  const titles = readLanguageMap(candidate.titles, 120, languages);
  const summaries = readLanguageMap(candidate.summaries, 320, languages);
  const captions = readLanguageMap(candidate.captions, 90, languages);

  const rawVocabulary = Array.isArray(candidate.vocabulary)
    ? candidate.vocabulary
    : [];

  const vocabulary = rawVocabulary
    .map((item) => validateVocabularyItem(item, languages, normalizeText(`${article.title} ${article.excerpt}`, 5000).toLowerCase()))
    .filter((item): item is VocabularyItem => item !== null)
    .slice(0, 3);

  // A card missing a language is dropped rather than served half-written:
  // the pool is shared, and one reader's blank is everyone's blank.
  if (
    languages.some(
      (language) => !titles[language] || !summaries[language],
    ) ||
    vocabulary.length !== 3 ||
    (languages.includes("en") && !hasAdvancedVocabularyDiversity(vocabulary.map(word => word.texts.en ?? "")))
  ) {
    return null;
  }

  return { titles, summaries, captions, vocabulary };
}

/*
 * The schema is built from the language list rather than naming two.
 *
 * Every card carries the story in each language the pool needs, keyed by
 * code, and so does every vocabulary word. Asking for a fixed pair is what
 * made Daily News the one screen where switching language changed nothing:
 * the content had never been asked to change.
 */
function buildLearningSchema(count: number, languages: LanguageCode[]) {
  const byLanguage = (minLength: number, maxLength: number) => ({
    type: "object",
    additionalProperties: false,
    properties: Object.fromEntries(
      languages.map((language) => [
        language,
        { type: "string", minLength, maxLength },
      ]),
    ),
    required: [...languages],
  });

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
            titles: byLanguage(4, 120),
            summaries: byLanguage(20, 320),
            captions: byLanguage(4, 90),
            vocabulary: {
              type: "array",
              minItems: 3,
              maxItems: 3,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  texts: byLanguage(1, 45),
                  sourceAnchor: { type: "string", minLength: 8, maxLength: 120 },
                  partOfSpeech: {
                    type: "string",
                    enum: ["noun", "verb", "adjective", "adverb", "phrase"],
                  },
                  examples: byLanguage(5, 180),
                },
                required: ["texts", "partOfSpeech", "examples", "sourceAnchor"],
              },
            },
          },
          required: ["titles", "summaries", "captions", "vocabulary"],
        },
      },
    },
    required: ["cards"],
  };
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
): Promise<NewsArticle[]> {
  const guardianApiKey = process.env.GUARDIAN_API_KEY;

  const candidateLists = await Promise.all(
    NEWS_SLOTS.map(async slot => {
      try {
        return slot.rss
          ? await fetchRssArticles(slot.rss, slot.category)
          : guardianApiKey ? await fetchSlotCandidates(slot, guardianApiKey) : [];
      } catch (error) {
        // A publisher timeout or malformed feed must not lose the whole day.
        console.warn(`News source unavailable: ${slot.rss?.name ?? slot.section ?? slot.query}`, error instanceof Error ? error.message : "Fetch failed");
        return [];
      }
    }),
  );

  const chosen: NewsArticle[] = [];
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
  articles: NewsArticle[],
  client: GoogleGenAI,
  languages: readonly LanguageCode[],
  budgetMs: number,
): Promise<DailyNewsPoolItem[]> {
  // Deliberately no `tools` field here — this call never touches Google
  // Search grounding, so it only ever draws on the normal (non-grounded)
  // Gemini free tier.
  const answer = await askText(client, {
    purpose: "daily-news",
    input: buildDailyNewsPrompt(articles, languages),
    schema: buildLearningSchema(articles.length, [...languages]),
    budgetMs,
    /*
     * A batch is a long answer — about ten seconds when all is well — so
     * the second model is only asked alongside once the first is clearly
     * stuck, not at the lookup's four seconds. Hedging early would spend
     * two requests on nearly every batch of a free tier counted per day.
     */
    hedgeAfterMs: 12_000,
    maxAttemptMs: 20_000,
    /* Nobody is waiting on the news; it yields to the camera and lookups. */
    background: true,
  });

  /*
   * gemini-3.6-flash alone produced nothing on 23–26 September and two
   * cards on the 27th: a 503, a 504 or a 429 on every batch. askText leads
   * with the lite alias and falls back, and only a batch that no model
   * answered is lost.
   */
  if (answer.text === null) {
    throw new Error("No model answered this batch.");
  }

  const outputText = answer.text;

  const parsed = JSON.parse(
    stripJsonCodeFence(outputText)
  ) as GeminiLearningResponse;

  const rawLearningItems = Array.isArray(parsed.cards) ? parsed.cards : [];

  const items: DailyNewsPoolItem[] = [];

  articles.forEach((article, index) => {
    const learning = validateLearningItem(rawLearningItems[index], languages, article);

    if (!learning) return;

    items.push({
      category: article.category,
      sourceUrl: article.url,
      publishedAt: article.publishedAt,
      card: {
        id: article.url,
        category: article.category,
        titles: learning.titles,
        summaries: learning.summaries,
        captions: learning.captions,
        vocabulary: learning.vocabulary,
        vocabularyLevel: "C2",
        imageUrl: article.imageUrl,
        sourceName: article.sourceName,
        sourceUrl: article.url,
        publishedAt: article.publishedAt,
      },
    });
  });

  return items;
}

/*
 * How many batches may be in flight at once.
 *
 * Every batch used to go at once, and the free tier allows twenty generate
 * requests a minute — so six simultaneous calls burst straight through it.
 * Production bore this out: batches 2 and 5 came back 429 most mornings,
 * losing a third of the day's cards, and on one of them every batch failed
 * and the pool was empty.
 *
 * Three keeps most of the reason the batches were parallel in the first
 * place. A batch takes about ten seconds, so six in two waves is roughly
 * twenty — comfortably inside the sixty-second ceiling the cron runs under
 * on Vercel's Hobby plan, even with a retry.
 */
/*
 * One at a time.
 *
 * Three in flight is what turned a request allowance into a burst: the free
 * tier counts requests per minute, and three arriving together is three
 * against a limit the 429s reported as five. Serially, four calls spread
 * across the run are under it.
 *
 * This costs wall time, which is why the deadline below exists.
 */
const MAX_CONCURRENT_BATCHES = 1;

/** One retry per batch. A second would risk the sixty-second ceiling. */
const RATE_LIMIT_RETRIES = 1;

/** Long enough to cover what the API asks for, short enough to fit. */
const MAX_RETRY_WAIT_MS = 12_000;

/*
 * How long the batches may take before no new one is started.
 *
 * maxDuration on the route is sixty seconds and cannot be raised on Hobby.
 * This leaves room for fetching the articles beforehand and writing the pool
 * afterwards — the write is what makes the whole run worth anything, and it
 * happens only if buildLearningCards returns.
 */
const BATCH_DEADLINE_MS = 45_000;

/** One batch, every candidate included. */
const MAX_BATCH_BUDGET_MS = 25_000;
/** A batch is not started with less than this; it could not finish. */
const MIN_BATCH_BUDGET_MS = 8_000;
/** When the last batch must be done by, leaving time to write the pool. */
const RUN_FINISH_BY_MS = 52_000;

function isRateLimited(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const status = (error as { status?: unknown }).status;
  const code = (error as { error?: { code?: unknown } }).error?.code;

  return status === 429 || code === "too_many_requests";
}

/*
 * The API says how long to wait — "Please retry in 5.159426619s" — and
 * nothing read it. Guessing a backoff when the server has already told you
 * the answer is how a retry either gives up too early or holds the cron open
 * for no reason.
 */
function retryDelayMs(error: unknown): number {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : "";

  const seconds = Number.parseFloat(
    message.match(/retry in ([\d.]+)s/i)?.[1] ?? "",
  );

  /* A second and a bit when it does not say, which the free tier tolerates. */
  const wait = Number.isFinite(seconds) ? seconds * 1000 + 250 : 1_500;

  return Math.min(wait, MAX_RETRY_WAIT_MS);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Runs one batch, giving a rate-limited request the wait it asked for. */
async function withRateLimitRetry<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= RATE_LIMIT_RETRIES || !isRateLimited(error)) throw error;

      await wait(retryDelayMs(error));
    }
  }
}

/*
 * Batches, at most MAX_CONCURRENT_BATCHES at a time.
 *
 * Settled rather than thrown, exactly as Promise.allSettled was: a batch that
 * fails must not take the others with it. Losing six cards on a day the model
 * hiccups is a thinner pool; losing all twelve is a day with no news.
 */
async function runBatches<T, R>(
  batches: readonly T[],
  run: (batch: T) => Promise<R>,
  deadline: number = Date.now() + BATCH_DEADLINE_MS,
): Promise<Array<PromiseSettledResult<R>>> {
  const results: Array<PromiseSettledResult<R>> = new Array(batches.length);
  let next = 0;

  async function worker() {
    while (next < batches.length) {
      const index = next++;

      /*
       * Running serially means the last batch can start late enough that the
       * function is killed before it answers — and a killed function writes
       * nothing at all, losing the batches that had already succeeded along
       * with the one that ran long. Stopping here instead gives the caller
       * back whatever is finished.
       */
      if (Date.now() >= deadline) {
        results[index] = {
          status: "rejected",
          reason: new Error(
            "Skipped: the run was out of time before this batch could start.",
          ),
        };
        continue;
      }

      try {
        results[index] = {
          status: "fulfilled",
          value: await withRateLimitRetry(() => run(batches[index])),
        };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(MAX_CONCURRENT_BATCHES, batches.length) },
      worker,
    ),
  );

  return results;
}

/*
 * Exposed for the tests, which are about the rate limiting rather than about
 * the news: the failure they guard is invisible to anything that only checks
 * the cards come out right, because on a good morning they always did.
 */
export const __testing = {
  runBatches,
  isRateLimited,
  retryDelayMs,
  MAX_CONCURRENT_BATCHES,
};

/**
 * Turns chosen articles into pool items.
 *
 * Split into batches because the cron job runs on Vercel's Hobby plan, where
 * sixty seconds is a hard ceiling that cannot be raised: several smaller
 * calls finish in a fraction of the wall time of one large one, for the same
 * number of tokens.
 *
 * They run a few at a time rather than all at once — see runBatches, and the
 * free-tier rate limit that all-at-once was walking into every morning.
 *
 * A batch that fails does not take the others down. Losing six cards on a
 * day the model hiccups is a thinner pool; losing all twelve because one
 * request failed is a day with no news at all.
 */
export async function buildLearningCards(
  articles: NewsArticle[],
  /*
   * The languages the pool should be written in, read from the accounts by
   * the caller. Defaulted so a caller with no opinion still produces the pool
   * that has always existed rather than none at all.
   */
  languages: readonly LanguageCode[] = DEFAULT_LEARNING_PAIR,
): Promise<DailyNewsPoolItem[]> {
  if (articles.length === 0) return [];

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const client = new GoogleGenAI({ apiKey });

  const perBatch = articlesPerBatch(languages.length);

  const batches: NewsArticle[][] = [];
  for (let i = 0; i < articles.length; i += perBatch) {
    batches.push(articles.slice(i, i + perBatch));
  }

  /*
   * Each batch gets what is left before the run must stop, capped so one
   * slow batch cannot take the whole minute — the pool write afterwards is
   * what makes any of it count.
   */
  const startedAt = Date.now();
  const deadline = startedAt + BATCH_DEADLINE_MS;
  const settled = await runBatches(
    batches,
    (batch) =>
      buildLearningBatch(
        batch,
        client,
        languages,
        Math.max(
          MIN_BATCH_BUDGET_MS,
          Math.min(MAX_BATCH_BUDGET_MS, startedAt + RUN_FINISH_BY_MS - Date.now()),
        ),
      ),
    deadline,
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
