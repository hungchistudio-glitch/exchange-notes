import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

const CATEGORIES = [
  "World",
  "Politics",
  "Business",
  "Technology",
  "Science",
  "Climate",
  "Health",
  "Culture",
] as const;

const PARTS_OF_SPEECH = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "phrase",
] as const;

type NewsCategory = (typeof CATEGORIES)[number];
type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number];

type VocabularyItem = {
  word: string;
  translation: string;
  partOfSpeech: PartOfSpeech;
  englishExample: string;
  chineseExample: string;
};

type NewsApiSource = {
  id: string | null;
  name: string;
};

type NewsApiArticle = {
  source: NewsApiSource;
  author: string | null;
  title: string | null;
  description: string | null;
  url: string | null;
  urlToImage: string | null;
  publishedAt: string | null;
  content: string | null;
};

type NewsApiResponse = {
  status: "ok" | "error";
  totalResults?: number;
  articles?: NewsApiArticle[];
  code?: string;
  message?: string;
};

type CandidateArticle = {
  articleId: string;
  categoryHint: NewsCategory;
  originalTitle: string;
  description: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  imageUrl: string | null;
  domain: string;
  importanceScore: number;
};

type GeneratedLearningCard = {
  articleId: string;
  category: NewsCategory;
  englishTitle: string;
  chineseTitle: string;
  englishSummary: string;
  chineseSummary: string;
  vocabulary: VocabularyItem[];
};

type GeminiLearningResponse = {
  cards: GeneratedLearningCard[];
};

type DailyNewsCard = {
  id: string;
  category: NewsCategory;
  englishTitle: string;
  chineseTitle: string;
  englishSummary: string;
  chineseSummary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  imageUrl: string | null;
  vocabulary: VocabularyItem[];
  aiEnhanced: boolean;
};

type NewsCache = {
  freshUntil: number;
  staleUntil: number;
  cards: DailyNewsCard[];
  generatedAt: string;
};

type CacheStatus = "hit" | "miss" | "stale";

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

const NEWS_CACHE_TTL_MS = 45 * 60 * 1000;
const STALE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const NEWS_API_TIMEOUT_MS = 12_000;
const GEMINI_TIMEOUT_MS = 35_000;

const MAX_CANDIDATES = 10;
const MAX_CACHED_CARDS = 8;
const CARDS_PER_RESPONSE = 3;
const MAX_ARTICLES_PER_SOURCE = 2;

let memoryCache: NewsCache | null = null;
let inFlightRefresh: Promise<DailyNewsCard[]> | null = null;

const ALLOWED_CATEGORIES = new Set<string>(CATEGORIES);
const ALLOWED_PARTS_OF_SPEECH = new Set<string>(PARTS_OF_SPEECH);

/*
 * This is a strict allowlist.
 * Random aggregators, firehose pages, and unknown local sites are rejected.
 */
const TRUSTED_DOMAINS = new Set([
  "reuters.com",
  "apnews.com",
  "bbc.com",
  "bbc.co.uk",
  "theguardian.com",
  "npr.org",
  "aljazeera.com",
  "dw.com",
  "france24.com",
  "cbc.ca",
  "abc.net.au",
  "channelnewsasia.com",
  "japantimes.co.jp",
  "scmp.com",
  "bloomberg.com",
  "cnbc.com",
  "ft.com",
  "economist.com",
  "euronews.com",
  "politico.com",
  "politico.eu",
  "nature.com",
  "science.org",
  "who.int",
  "un.org",
  "worldbank.org",
  "imf.org",
  "nasa.gov",
  "noaa.gov",
  "esa.int",
]);

const BLOCKED_CONTENT_PATTERNS: RegExp[] = [
  /\blive updates?\b/i,
  /\blive blog\b/i,
  /\bopinion\b/i,
  /\bcommentary\b/i,
  /\bhoroscope\b/i,
  /\blottery\b/i,
  /\bshopping\b/i,
  /\bdeals?\b/i,
  /\bcelebrity\b/i,
  /\bsponsored\b/i,
  /\badvertisement\b/i,
  /\bwatch live\b/i,
  /\bphoto gallery\b/i,

  // Sports
  /\bsports?\b/i,
  /\bfootball\b/i,
  /\bsoccer\b/i,
  /\brugby\b/i,
  /\btennis\b/i,
  /\bcricket\b/i,
  /\bbasketball\b/i,
  /\bbaseball\b/i,
  /\bhockey\b/i,
  /\bgolf\b/i,
  /\bchampionship\b/i,
  /\btournament\b/i,
  /\bplayoffs?\b/i,
  /\bmatch\b/i,
  /\bscore\b/i,
  /\bfixture\b/i,
  /\bunder-?20s?\b/i,
  /\bu20s?\b/i,
  /\bworld cup\b/i,
];

const MAJOR_NEWS_KEYWORDS = [
  "election",
  "government",
  "president",
  "prime minister",
  "parliament",
  "cabinet",
  "policy",
  "war",
  "conflict",
  "ceasefire",
  "sanction",
  "security",
  "economy",
  "inflation",
  "interest rate",
  "central bank",
  "trade",
  "tariff",
  "market",
  "recession",
  "technology",
  "artificial intelligence",
  "semiconductor",
  "cybersecurity",
  "climate",
  "earthquake",
  "wildfire",
  "flood",
  "storm",
  "emissions",
  "health",
  "vaccine",
  "disease",
  "science",
  "research",
  "space",
  "energy",
  "international",
  "global",
  "united nations",
];

/* -------------------------------------------------------------------------- */
/* Gemini schema                                                              */
/* -------------------------------------------------------------------------- */

const NEWS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    cards: {
      type: "array",
      minItems: CARDS_PER_RESPONSE,
      maxItems: MAX_CACHED_CARDS,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          articleId: {
            type: "string",
          },
          category: {
            type: "string",
            enum: CATEGORIES,
          },
          englishTitle: {
            type: "string",
            minLength: 8,
            maxLength: 120,
          },
          chineseTitle: {
            type: "string",
            minLength: 4,
            maxLength: 80,
          },
          englishSummary: {
            type: "string",
            minLength: 30,
            maxLength: 320,
          },
          chineseSummary: {
            type: "string",
            minLength: 12,
            maxLength: 220,
          },
          vocabulary: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                word: {
                  type: "string",
                  minLength: 2,
                  maxLength: 45,
                },
                translation: {
                  type: "string",
                  minLength: 1,
                  maxLength: 40,
                },
                partOfSpeech: {
                  type: "string",
                  enum: PARTS_OF_SPEECH,
                },
                englishExample: {
                  type: "string",
                  minLength: 8,
                  maxLength: 180,
                },
                chineseExample: {
                  type: "string",
                  minLength: 4,
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
          "articleId",
          "category",
          "englishTitle",
          "chineseTitle",
          "englishSummary",
          "chineseSummary",
          "vocabulary",
        ],
      },
    },
  },
  required: ["cards"],
} as const;

/* -------------------------------------------------------------------------- */
/* Text and URL utilities                                                     */
/* -------------------------------------------------------------------------- */

function decodeBasicHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&#38;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function normalizeText(value: unknown, maximumLength: number): string {
  if (typeof value !== "string") {
    return "";
  }

  return decodeBasicHtmlEntities(value)
    .replace(/\[\+\d+\s+chars?\]$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength);
}

function cleanDescription(value: string): string {
  return normalizeText(value, 500)
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 320);
}

function normalizeDomain(value: string): string {
  return value.toLowerCase().replace(/^www\./, "").trim();
}

function getUrlDomain(value: string): string {
  try {
    return normalizeDomain(new URL(value).hostname);
  } catch {
    return "";
  }
}

function isTrustedDomain(domain: string): boolean {
  return Array.from(TRUSTED_DOMAINS).some(
    (trustedDomain) =>
      domain === trustedDomain || domain.endsWith(`.${trustedDomain}`)
  );
}

function normalizeSourceUrl(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const decodedValue = decodeBasicHtmlEntities(value).trim();

  try {
    const url = new URL(decodedValue);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "";
    }

    url.hash = "";

    const removableParameters = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "gclid",
      "fbclid",
      "mc_cid",
      "mc_eid",
      "xtor",
      "partner",
      "ref",
      "referrer",
      "output",
    ];

    for (const parameter of removableParameters) {
      url.searchParams.delete(parameter);
    }

    return url.toString();
  } catch {
    return "";
  }
}

function normalizeImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const decodedValue = decodeBasicHtmlEntities(value).trim();

  try {
    const url = new URL(decodedValue);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function normalizePublishedAt(value: unknown): string {
  if (typeof value !== "string") {
    return new Date().toISOString();
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return new Date().toISOString();
  }

  const now = Date.now();
  const futureTolerance = 10 * 60 * 1000;

  if (parsedDate.getTime() > now + futureTolerance) {
    return new Date().toISOString();
  }

  return parsedDate.toISOString();
}

function cleanArticleTitle(value: string): string {
  return normalizeText(value, 180)
    .replace(/\s+[|\-–—]\s+[^|\-–—]{2,60}$/u, "")
    .trim();
}

function normalizedTitleKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(
      /\b(the|a|an|to|of|in|on|for|and|with|as|at|by|from|after|over|new)\b/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

function createStableId(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function containsBlockedContent(value: string): boolean {
  return BLOCKED_CONTENT_PATTERNS.some((pattern) => pattern.test(value));
}

/* -------------------------------------------------------------------------- */
/* Article filtering and ranking                                              */
/* -------------------------------------------------------------------------- */

function isUsableArticle(
  article: NewsApiArticle
): article is NewsApiArticle & {
  title: string;
  url: string;
  publishedAt: string;
} {
  const title = article.title?.trim();
  const url = article.url?.trim();
  const publishedAt = article.publishedAt?.trim();

  if (!title || !url || !publishedAt) {
    return false;
  }

  if (title === "[Removed]" || title.length < 20) {
    return false;
  }

  const normalizedUrl = normalizeSourceUrl(url);

  if (!normalizedUrl) {
    return false;
  }

  const content = [
    title,
    article.description ?? "",
    article.content ?? "",
    normalizedUrl,
  ].join(" ");

  return !containsBlockedContent(content);
}

function inferCategory(title: string, description: string): NewsCategory {
  const titleText = title.toLowerCase();
  const fullText = `${title} ${description}`.toLowerCase();

  // Headline signals receive priority.
  if (
    /\b(election|government|president|prime minister|minister|parliament|senate|cabinet|politics|policy|reshuffle)\b/.test(
      titleText
    )
  ) {
    return "Politics";
  }

  if (
    /\b(ai|artificial intelligence|software|chip|semiconductor|cybersecurity|technology|tech)\b/.test(
      fullText
    )
  ) {
    return "Technology";
  }

  if (
    /\b(science|scientist|research|space|nasa|astronomy|discovery|breakthrough)\b/.test(
      fullText
    )
  ) {
    return "Science";
  }

  if (
    /\b(climate|weather|wildfire|flood|earthquake|environment|carbon|emissions|storm|heatwave)\b/.test(
      fullText
    )
  ) {
    return "Climate";
  }

  if (
    /\b(health|hospital|disease|vaccine|virus|medical|medicine|outbreak|measles|who)\b/.test(
      fullText
    )
  ) {
    return "Health";
  }

  if (
    /\b(economy|business|market|trade|bank|inflation|company|stocks|tariff|recession)\b/.test(
      fullText
    )
  ) {
    return "Business";
  }

  if (
    /\b(culture|film|museum|art|music|book|festival|exhibition)\b/.test(
      fullText
    )
  ) {
    return "Culture";
  }

  return "World";
}

function calculateImportanceScore(
  title: string,
  description: string,
  domain: string,
  publishedAt: string
): number {
  const combined = `${title} ${description}`.toLowerCase();

  let score = 0;

  for (const keyword of MAJOR_NEWS_KEYWORDS) {
    if (combined.includes(keyword)) {
      score += 4;
    }
  }

  if (isTrustedDomain(domain)) {
    score += 15;
  }

  const publishedTime = new Date(publishedAt).getTime();

  if (Number.isFinite(publishedTime)) {
    const ageInHours = Math.max(0, (Date.now() - publishedTime) / 3_600_000);

    if (ageInHours <= 12) {
      score += 12;
    } else if (ageInHours <= 24) {
      score += 9;
    } else if (ageInHours <= 48) {
      score += 5;
    }
  }

  if (description.length >= 80) {
    score += 4;
  }

  if (title.length >= 35 && title.length <= 110) {
    score += 3;
  }

  return score;
}

/*
 * Blocked "secondary" domains that should never be used even as a fallback
 * (aggregators, social platforms, generic blog hosts, etc).
 */
const BLOCKED_SECONDARY_DOMAINS = [
  "slashdot.org",
  "yahoo.com",
  "msn.com",
  "news.google.com",
  "google.com",
  "facebook.com",
  "x.com",
  "twitter.com",
  "reddit.com",
  "medium.com",
  "substack.com",
  "blogspot.com",
  "wordpress.com",
];

function isAcceptableSecondarySource(domain: string): boolean {
  if (!domain) {
    return false;
  }

  const isBlocked = BLOCKED_SECONDARY_DOMAINS.some(
    (blockedDomain) =>
      domain === blockedDomain || domain.endsWith(`.${blockedDomain}`)
  );

  if (isBlocked) {
    return false;
  }

  /*
   * Reject obviously malformed hostnames and
   * accept normal publisher domains as fallback.
   */
  return domain.includes(".") && domain.length >= 4 && domain.length <= 100;
}

function prepareCandidates(articles: NewsApiArticle[]): CandidateArticle[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const sourceCounts = new Map<string, number>();

  const trustedCandidates: CandidateArticle[] = [];
  const secondaryCandidates: CandidateArticle[] = [];

  for (const article of articles) {
    if (!isUsableArticle(article)) {
      continue;
    }

    const sourceUrl = normalizeSourceUrl(article.url);
    const domain = getUrlDomain(sourceUrl);

    if (!sourceUrl || !domain || seenUrls.has(sourceUrl)) {
      continue;
    }

    const originalTitle = cleanArticleTitle(article.title);
    const titleKey = normalizedTitleKey(originalTitle);

    if (!originalTitle || !titleKey || seenTitles.has(titleKey)) {
      continue;
    }

    const rawDescription =
      article.description || article.content || originalTitle;

    const description = cleanDescription(rawDescription);
    const searchableContent = `${originalTitle} ${description} ${sourceUrl}`;

    if (containsBlockedContent(searchableContent)) {
      continue;
    }

    const currentSourceCount = sourceCounts.get(domain) ?? 0;

    if (currentSourceCount >= MAX_ARTICLES_PER_SOURCE) {
      continue;
    }

    const publishedAt = normalizePublishedAt(article.publishedAt);

    const candidate: CandidateArticle = {
      articleId: createStableId(sourceUrl),
      categoryHint: inferCategory(originalTitle, description),
      originalTitle,
      description: description || originalTitle,
      sourceName: normalizeText(article.source?.name, 80) || domain,
      sourceUrl,
      publishedAt,
      imageUrl: normalizeImageUrl(article.urlToImage),
      domain,
      importanceScore: calculateImportanceScore(
        originalTitle,
        description,
        domain,
        publishedAt
      ),
    };

    if (isTrustedDomain(domain)) {
      trustedCandidates.push(candidate);
    } else if (isAcceptableSecondarySource(domain)) {
      secondaryCandidates.push(candidate);
    } else {
      continue;
    }

    seenUrls.add(sourceUrl);
    seenTitles.add(titleKey);
    sourceCounts.set(domain, currentSourceCount + 1);
  }

  const sortCandidates = (candidates: CandidateArticle[]) =>
    candidates.sort((left, right) => {
      if (right.importanceScore !== left.importanceScore) {
        return right.importanceScore - left.importanceScore;
      }

      return (
        new Date(right.publishedAt).getTime() -
        new Date(left.publishedAt).getTime()
      );
    });

  const trusted = sortCandidates(trustedCandidates);
  const secondary = sortCandidates(secondaryCandidates);

  /*
   * Trusted publishers are always first.
   * Secondary sources are used only when the strict
   * allowlist cannot supply enough stories.
   */
  return [...trusted, ...secondary].slice(0, MAX_CANDIDATES);
}

/* -------------------------------------------------------------------------- */
/* Seen-story rotation                                                        */
/* -------------------------------------------------------------------------- */

function parseSeenValues(request: NextRequest): Set<string> {
  const rawValue =
    request.nextUrl.searchParams.get("seen") ||
    request.nextUrl.searchParams.get("exclude");

  if (!rawValue) {
    return new Set<string>();
  }

  const values = rawValue
    .split(/\|\||,/)
    .map((item) => {
      try {
        return decodeURIComponent(item);
      } catch {
        return item;
      }
    })
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 40);

  const result = new Set<string>();

  for (const value of values) {
    result.add(value);
    result.add(normalizedTitleKey(value));
  }

  return result;
}

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));

    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

function chooseResponseCards(
  cards: DailyNewsCard[],
  seenValues: Set<string>
): DailyNewsCard[] {
  const unseenCards = cards.filter((card) => {
    const titleKey = normalizedTitleKey(card.englishTitle);

    return !seenValues.has(card.id) && !seenValues.has(titleKey);
  });

  if (unseenCards.length >= CARDS_PER_RESPONSE) {
    return shuffle(unseenCards).slice(0, CARDS_PER_RESPONSE);
  }

  const unseenIds = new Set(unseenCards.map((card) => card.id));

  const supplementaryCards = shuffle(
    cards.filter((card) => !unseenIds.has(card.id))
  );

  return [...shuffle(unseenCards), ...supplementaryCards].slice(
    0,
    CARDS_PER_RESPONSE
  );
}

/* -------------------------------------------------------------------------- */
/* NewsAPI                                                                    */
/* -------------------------------------------------------------------------- */

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchNewsApiArticles(): Promise<NewsApiArticle[]> {
  const newsApiKey = process.env.NEWS_API_KEY?.trim();

  if (!newsApiKey) {
    throw new Error("NEWS_API_KEY_MISSING");
  }

  const query = [
    "election",
    "government",
    "economy",
    "technology",
    "science",
    "climate",
    "health",
    "international",
  ]
    .map((keyword) => `"${keyword}"`)
    .join(" OR ");

  const parameters = new URLSearchParams({
    q: `(${query})`,
    searchIn: "title,description",
    language: "en",
    sortBy: "publishedAt",
    pageSize: "100",
  });

  const response = await fetchWithTimeout(
    `https://newsapi.org/v2/everything?${parameters.toString()}`,
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "X-Api-Key": newsApiKey,
      },
    },
    NEWS_API_TIMEOUT_MS
  );

  let payload: NewsApiResponse;

  try {
    payload = (await response.json()) as NewsApiResponse;
  } catch {
    throw new Error(`NEWS_API_INVALID_RESPONSE:${response.status}`);
  }

  if (!response.ok || payload.status !== "ok") {
    throw new Error(
      `NEWS_API_ERROR:${payload.code ?? response.status}:${
        payload.message ?? "Unable to retrieve news."
      }`
    );
  }

  return Array.isArray(payload.articles) ? payload.articles : [];
}

/* -------------------------------------------------------------------------- */
/* Gemini                                                                     */
/* -------------------------------------------------------------------------- */

function createGeminiPrompt(candidates: CandidateArticle[]): string {
  const articleData = candidates.map((candidate) => ({
    articleId: candidate.articleId,
    categoryHint: candidate.categoryHint,
    originalTitle: candidate.originalTitle,
    description: candidate.description,
    sourceName: candidate.sourceName,
    publishedAt: candidate.publishedAt,
  }));

  return `
You create accurate bilingual news-learning cards for Traditional Chinese readers in Taiwan.

You must use only the supplied NewsAPI article metadata.

NON-NEGOTIABLE ACCURACY RULES:
- Do not search the web.
- Do not invent facts.
- Do not invent URLs.
- Do not invent names, dates, numbers, quotations, causes, locations, or outcomes.
- Do not merge separate stories.
- Preserve every selected articleId exactly.
- If article information is limited, write a short and cautious summary.
- Never claim more than the supplied title and description support.

SELECTION RULES:
- Select between 3 and ${MAX_CACHED_CARDS} distinct stories.
- Prioritize internationally important developments.
- Do not select sports, entertainment gossip, opinion, shopping, or duplicate stories.
- Avoid selecting several reports about the same event.

LANGUAGE-LEARNING RULES:
- Rewrite the headline in natural CEFR B1-B2 English.
- Translate it into natural Traditional Chinese used in Taiwan.
- Write a concise factual English summary.
- Translate the summary accurately into Traditional Chinese.
- Select exactly 3 useful B1-B2 words or phrases from the title or summary.
- Give each item a Traditional Chinese meaning and part of speech.
- Create one original English learning example and one Traditional Chinese translation.
- Example sentences must not make new claims about the news event.

Return only JSON matching the required schema.

ARTICLES:
${JSON.stringify(articleData)}
`.trim();
}

function validateVocabularyItem(value: unknown): VocabularyItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  const word = normalizeText(candidate.word, 45);
  const translation = normalizeText(candidate.translation, 40);
  const partOfSpeech = normalizeText(candidate.partOfSpeech, 20);
  const englishExample = normalizeText(candidate.englishExample, 180);
  const chineseExample = normalizeText(candidate.chineseExample, 130);

  if (
    !word ||
    !translation ||
    !ALLOWED_PARTS_OF_SPEECH.has(partOfSpeech) ||
    !englishExample ||
    !chineseExample
  ) {
    return null;
  }

  return {
    word,
    translation,
    partOfSpeech: partOfSpeech as PartOfSpeech,
    englishExample,
    chineseExample,
  };
}

function validateGeneratedCard(value: unknown): GeneratedLearningCard | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  const articleId = normalizeText(candidate.articleId, 80);
  const category = normalizeText(candidate.category, 30);
  const englishTitle = normalizeText(candidate.englishTitle, 120);
  const chineseTitle = normalizeText(candidate.chineseTitle, 80);
  const englishSummary = normalizeText(candidate.englishSummary, 320);
  const chineseSummary = normalizeText(candidate.chineseSummary, 220);

  const rawVocabulary = Array.isArray(candidate.vocabulary)
    ? candidate.vocabulary
    : [];

  const vocabulary = rawVocabulary
    .map(validateVocabularyItem)
    .filter((item): item is VocabularyItem => item !== null)
    .slice(0, 3);

  if (
    !articleId ||
    !ALLOWED_CATEGORIES.has(category) ||
    !englishTitle ||
    !chineseTitle ||
    !englishSummary ||
    !chineseSummary ||
    vocabulary.length !== 3
  ) {
    return null;
  }

  return {
    articleId,
    category: category as NewsCategory,
    englishTitle,
    chineseTitle,
    englishSummary,
    chineseSummary,
    vocabulary,
  };
}

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  timeoutCode: string
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(timeoutCode));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function enrichWithGemini(
  candidates: CandidateArticle[]
): Promise<DailyNewsCard[]> {
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

  const ai = new GoogleGenAI({
    apiKey: geminiApiKey,
  });

  const operation = ai.models.generateContent({
    model,
    contents: createGeminiPrompt(candidates),
    config: {
      responseMimeType: "application/json",
      responseSchema: NEWS_SCHEMA,
      temperature: 0.1,
      maxOutputTokens: 5000,
    },
  });

  const response = await withTimeout(
    operation,
    GEMINI_TIMEOUT_MS,
    "GEMINI_TIMEOUT"
  );

  const outputText =
    typeof response.text === "string" ? response.text.trim() : "";

  if (!outputText) {
    throw new Error("GEMINI_EMPTY_RESPONSE");
  }

  let parsed: GeminiLearningResponse;

  try {
    parsed = JSON.parse(outputText) as GeminiLearningResponse;
  } catch {
    throw new Error("GEMINI_INVALID_JSON");
  }

  const generatedCards = Array.isArray(parsed.cards)
    ? parsed.cards
        .map(validateGeneratedCard)
        .filter((card): card is GeneratedLearningCard => card !== null)
    : [];

  const sourceById = new Map(
    candidates.map((candidate) => [candidate.articleId, candidate])
  );

  const cards = generatedCards
    .map((generated): DailyNewsCard | null => {
      const source = sourceById.get(generated.articleId);

      if (!source) {
        return null;
      }

      return {
        id: source.articleId,
        category: generated.category,
        englishTitle: generated.englishTitle,
        chineseTitle: generated.chineseTitle,
        englishSummary: generated.englishSummary,
        chineseSummary: generated.chineseSummary,
        sourceName: source.sourceName,
        sourceUrl: source.sourceUrl,
        publishedAt: source.publishedAt,
        imageUrl: source.imageUrl,
        vocabulary: generated.vocabulary,
        aiEnhanced: true,
      };
    })
    .filter((card): card is DailyNewsCard => card !== null);

  return Array.from(
    new Map(cards.map((card) => [card.id, card])).values()
  ).slice(0, MAX_CACHED_CARDS);
}

/* -------------------------------------------------------------------------- */
/* Fallback                                                                   */
/* -------------------------------------------------------------------------- */

function createFallbackCards(
  candidates: CandidateArticle[]
): DailyNewsCard[] {
  return candidates.slice(0, MAX_CACHED_CARDS).map((candidate) => ({
    id: candidate.articleId,
    category: candidate.categoryHint,
    englishTitle: candidate.originalTitle,
    chineseTitle: "",
    englishSummary: candidate.description || candidate.originalTitle,
    chineseSummary: "",
    sourceName: candidate.sourceName,
    sourceUrl: candidate.sourceUrl,
    publishedAt: candidate.publishedAt,
    imageUrl: candidate.imageUrl,
    vocabulary: [],
    aiEnhanced: false,
  }));
}

async function createFreshCardPool(): Promise<DailyNewsCard[]> {
  const rawArticles = await fetchNewsApiArticles();
  const candidates = prepareCandidates(rawArticles);

  if (candidates.length < CARDS_PER_RESPONSE) {
    throw new Error("NO_SUITABLE_NEWS");
  }

  try {
    const enhancedCards = await enrichWithGemini(candidates);

    if (enhancedCards.length >= CARDS_PER_RESPONSE) {
      const enhancedIds = new Set(enhancedCards.map((card) => card.id));

      const fallbackCards = createFallbackCards(candidates).filter(
        (card) => !enhancedIds.has(card.id)
      );

      return [...enhancedCards, ...fallbackCards].slice(0, MAX_CACHED_CARDS);
    }

    console.warn(
      "Gemini returned fewer than three valid cards; using NewsAPI fallback."
    );

    return createFallbackCards(candidates);
  } catch (error) {
    console.warn(
      "Gemini enhancement unavailable; using NewsAPI fallback:",
      error instanceof Error ? error.message : error
    );

    return createFallbackCards(candidates);
  }
}

/* -------------------------------------------------------------------------- */
/* Cache                                                                      */
/* -------------------------------------------------------------------------- */

async function refreshCardPool(): Promise<DailyNewsCard[]> {
  if (!inFlightRefresh) {
    inFlightRefresh = createFreshCardPool()
      .then((cards) => {
        const generatedAt = new Date().toISOString();

        memoryCache = {
          cards,
          generatedAt,
          freshUntil: Date.now() + NEWS_CACHE_TTL_MS,
          staleUntil: Date.now() + STALE_CACHE_TTL_MS,
        };

        return cards;
      })
      .finally(() => {
        inFlightRefresh = null;
      });
  }

  return inFlightRefresh;
}

async function getCardPool(): Promise<{
  cards: DailyNewsCard[];
  cacheStatus: CacheStatus;
  generatedAt: string;
}> {
  const now = Date.now();

  if (
    memoryCache &&
    memoryCache.freshUntil > now &&
    memoryCache.cards.length >= CARDS_PER_RESPONSE
  ) {
    return {
      cards: memoryCache.cards,
      cacheStatus: "hit",
      generatedAt: memoryCache.generatedAt,
    };
  }

  try {
    const cards = await refreshCardPool();

    return {
      cards,
      cacheStatus: "miss",
      generatedAt: memoryCache?.generatedAt ?? new Date().toISOString(),
    };
  } catch (error) {
    if (
      memoryCache &&
      memoryCache.staleUntil > now &&
      memoryCache.cards.length >= CARDS_PER_RESPONSE
    ) {
      console.warn(
        "Fresh news failed; returning stale cached cards:",
        error instanceof Error ? error.message : error
      );

      return {
        cards: memoryCache.cards,
        cacheStatus: "stale",
        generatedAt: memoryCache.generatedAt,
      };
    }

    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* Public errors                                                              */
/* -------------------------------------------------------------------------- */

function getPublicError(error: unknown): {
  message: string;
  status: number;
} {
  const rawMessage = error instanceof Error ? error.message : String(error);

  if (rawMessage.includes("NEWS_API_KEY_MISSING")) {
    return {
      message: "Daily News is not configured yet.",
      status: 500,
    };
  }

  if (
    rawMessage.includes("apiKeyInvalid") ||
    rawMessage.includes("apiKeyDisabled")
  ) {
    return {
      message: "The news provider configuration is invalid.",
      status: 500,
    };
  }

  if (
    rawMessage.includes("rateLimited") ||
    rawMessage.includes("maximumResultsReached")
  ) {
    return {
      message:
        "Daily News has reached its provider limit. Please try again later.",
      status: 429,
    };
  }

  if (rawMessage.includes("AbortError") || rawMessage.includes("TIMEOUT")) {
    return {
      message: "The news service took too long to respond. Please try again.",
      status: 504,
    };
  }

  if (rawMessage.includes("NO_SUITABLE_NEWS")) {
    return {
      message:
        "No suitable major stories are available right now. Please try again shortly.",
      status: 503,
    };
  }

  return {
    message: "Daily News could not be loaded. Please try again shortly.",
    status: 500,
  };
}

/* -------------------------------------------------------------------------- */
/* Route                                                                      */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest) {
  try {
    const seenValues = parseSeenValues(request);

    const { cards, cacheStatus, generatedAt } = await getCardPool();

    const selectedCards = chooseResponseCards(cards, seenValues);

    if (selectedCards.length < CARDS_PER_RESPONSE) {
      throw new Error("NO_SUITABLE_NEWS");
    }

    return NextResponse.json(
      {
        cards: selectedCards,
        generatedAt,
        cacheStatus,
        aiEnhanced: selectedCards.some((card) => card.aiEnhanced),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-store, max-age=0, must-revalidate",
          "X-Daily-News-Cache": cacheStatus,
        },
      }
    );
  } catch (error) {
    console.error(
      "Daily News route error:",
      error instanceof Error ? error.message : error
    );

    const publicError = getPublicError(error);

    return NextResponse.json(
      {
        error: publicError.message,
      },
      {
        status: publicError.status,
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      }
    );
  }
}
