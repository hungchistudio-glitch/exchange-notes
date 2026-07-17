import {
  BLOCKED_DOMAINS,
  MAX_ARTICLES_PER_SOURCE,
  MAX_CARD_POOL,
  MAX_NEWS_CANDIDATES,
  NEWS_API_PAGE_SIZE,
  NEWS_LANGUAGE,
  NEWS_QUERY,
  NEWS_TIMEOUT_MS,
  TOP_HEADLINES_COUNTRY,
  TRUSTED_DOMAINS,
} from "./config";

import type { DailyNewsCard } from "./types";

/* -------------------------------------------------------------------------- */
/* NewsAPI types                                                              */
/* -------------------------------------------------------------------------- */

export type NewsApiSource = {
  id: string | null;
  name: string;
};

export type NewsApiArticle = {
  source: NewsApiSource;
  author: string | null;
  title: string | null;
  description: string | null;
  url: string | null;
  urlToImage: string | null;
  publishedAt: string | null;
  content: string | null;
};

type NewsApiSuccessResponse = {
  status: "ok";
  totalResults: number;
  articles: NewsApiArticle[];
};

type NewsApiErrorResponse = {
  status: "error";
  code?: string;
  message?: string;
};

type NewsApiResponse =
  | NewsApiSuccessResponse
  | NewsApiErrorResponse;

export type CandidateArticle = {
  articleId: string;
  categoryHint: DailyNewsCard["category"];
  originalTitle: string;
  description: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  imageUrl: string | null;
  domain: string;
  importanceScore: number;
  trustedSource: boolean;
};

/* -------------------------------------------------------------------------- */
/* Filtering configuration                                                    */
/* -------------------------------------------------------------------------- */

const TRACKING_PARAMETERS = [
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
  "guccounter",
  "guce_referrer",
  "guce_referrer_sig",
] as const;

const BLOCKED_CONTENT_PATTERNS: RegExp[] = [
  /\blive updates?\b/i,
  /\blive blog\b/i,
  /\bbreaking live\b/i,
  /\bopinion\b/i,
  /\bcommentary\b/i,
  /\beditorial\b/i,
  /\bhoroscope\b/i,
  /\blottery\b/i,
  /\bshopping\b/i,
  /\bdeals?\b/i,
  /\bcoupons?\b/i,
  /\bcelebrity\b/i,
  /\bgossip\b/i,
  /\bsponsored\b/i,
  /\badvertisement\b/i,
  /\bwatch live\b/i,
  /\bphoto gallery\b/i,
  /\bnewsletter\b/i,

  // Sports-specific terms.
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
  /\bfixture\b/i,
  /\bgrand slam\b/i,
  /\bpremier league\b/i,
  /\bworld cup qualifier\b/i,
  /\bnba\b/i,
  /\bnfl\b/i,
  /\bmlb\b/i,
  /\bnhl\b/i,
  /\bu-?20\b/i,
  /\bunder-?20\b/i,
  /\bwins? \d+\s*[-–]\s*\d+\b/i,
  /\bbeats? .+ \d+\s*[-–]\s*\d+\b/i,
  /\bdefeats? .+ in (the )?(final|semifinal)\b/i,
];

const MAJOR_NEWS_KEYWORDS = [
  "election",
  "government",
  "president",
  "prime minister",
  "parliament",
  "cabinet",
  "policy",
  "diplomatic",
  "war",
  "conflict",
  "ceasefire",
  "sanction",
  "security",
  "military",
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
  "outbreak",
  "science",
  "research",
  "space",
  "energy",
  "international",
  "global",
  "united nations",
] as const;

/* -------------------------------------------------------------------------- */
/* Text utilities                                                             */
/* -------------------------------------------------------------------------- */

function decodeBasicHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&#38;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function normalizeText(
  value: unknown,
  maximumLength: number
): string {
  if (typeof value !== "string") {
    return "";
  }

  return decodeBasicHtmlEntities(value)
    .replace(/\u0000/g, "")
    .replace(/\[\+\d+\s+chars?\]$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength);
}

function cleanDescription(value: string): string {
  return normalizeText(value, 700)
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\[\+\d+\s+chars?\]$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 360);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanArticleTitle(
  value: string,
  sourceName: string
): string {
  let title = normalizeText(value, 180);
  const cleanSourceName = normalizeText(sourceName, 80);

  if (cleanSourceName) {
    const suffixPattern = new RegExp(
      `\\s+[|–—-]\\s+${escapeRegExp(cleanSourceName)}$`,
      "i"
    );

    title = title.replace(suffixPattern, "");
  }

  return title.trim();
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
  return BLOCKED_CONTENT_PATTERNS.some((pattern) =>
    pattern.test(value)
  );
}

/* -------------------------------------------------------------------------- */
/* URL utilities                                                              */
/* -------------------------------------------------------------------------- */

function normalizeDomain(value: string): string {
  return value
    .toLowerCase()
    .replace(/^www\./, "")
    .trim();
}

function getUrlDomain(value: string): string {
  try {
    return normalizeDomain(new URL(value).hostname);
  } catch {
    return "";
  }
}

function domainMatches(
  domain: string,
  expectedDomain: string
): boolean {
  return (
    domain === expectedDomain ||
    domain.endsWith(`.${expectedDomain}`)
  );
}

function isTrustedDomain(domain: string): boolean {
  return TRUSTED_DOMAINS.some((trustedDomain) =>
    domainMatches(domain, trustedDomain)
  );
}

function isBlockedDomain(domain: string): boolean {
  return BLOCKED_DOMAINS.some((blockedDomain) =>
    domainMatches(domain, blockedDomain)
  );
}

function isAcceptableSecondaryDomain(domain: string): boolean {
  if (
    !domain ||
    !domain.includes(".") ||
    domain.length < 4 ||
    domain.length > 120 ||
    isBlockedDomain(domain)
  ) {
    return false;
  }

  return /^[a-z0-9.-]+$/i.test(domain);
}

function normalizeSourceUrl(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const decodedValue = decodeBasicHtmlEntities(value).trim();

  try {
    const url = new URL(decodedValue);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      return "";
    }

    url.hash = "";

    for (const parameter of TRACKING_PARAMETERS) {
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

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
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

  const tenMinutesFromNow = Date.now() + 10 * 60 * 1000;

  if (parsedDate.getTime() > tenMinutesFromNow) {
    return new Date().toISOString();
  }

  return parsedDate.toISOString();
}

/* -------------------------------------------------------------------------- */
/* Category and ranking                                                       */
/* -------------------------------------------------------------------------- */

function inferCategory(
  title: string,
  description: string
): DailyNewsCard["category"] {
  const titleText = title.toLowerCase();
  const fullText = `${title} ${description}`.toLowerCase();

  if (
    /\b(election|government|president|prime minister|minister|parliament|senate|cabinet|politics|policy|reshuffle|congress)\b/.test(
      titleText
    )
  ) {
    return "Politics";
  }

  if (
    /\b(ai|artificial intelligence|software|chip|semiconductor|cybersecurity|technology|tech|robot|computing)\b/.test(
      fullText
    )
  ) {
    return "Technology";
  }

  if (
    /\b(science|scientist|research|space|nasa|astronomy|discovery|breakthrough|experiment)\b/.test(
      fullText
    )
  ) {
    return "Science";
  }

  if (
    /\b(climate|weather|wildfire|flood|earthquake|environment|carbon|emissions|storm|heatwave|drought)\b/.test(
      fullText
    )
  ) {
    return "Climate";
  }

  if (
    /\b(health|hospital|disease|vaccine|virus|medical|medicine|outbreak|measles|pandemic)\b/.test(
      fullText
    )
  ) {
    return "Health";
  }

  if (
    /\b(economy|business|market|trade|bank|inflation|company|stocks|tariff|recession|investment|finance)\b/.test(
      fullText
    )
  ) {
    return "Business";
  }

  if (
    /\b(culture|film|museum|art|music|book|festival|exhibition|heritage)\b/.test(
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
  publishedAt: string,
  hasImage: boolean
): number {
  const combined = `${title} ${description}`.toLowerCase();
  let score = 0;

  for (const keyword of MAJOR_NEWS_KEYWORDS) {
    if (combined.includes(keyword)) {
      score += 4;
    }
  }

  if (isTrustedDomain(domain)) {
    score += 20;
  }

  const publishedTime = new Date(publishedAt).getTime();

  if (Number.isFinite(publishedTime)) {
    const ageInHours = Math.max(
      0,
      (Date.now() - publishedTime) / 3_600_000
    );

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

  if (title.length >= 35 && title.length <= 115) {
    score += 3;
  }

  if (hasImage) {
    score += 2;
  }

  return score;
}

/* -------------------------------------------------------------------------- */
/* Article validation                                                         */
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

  if (
    title === "[Removed]" ||
    title.length < 20
  ) {
    return false;
  }

  const normalizedUrl = normalizeSourceUrl(url);

  if (!normalizedUrl) {
    return false;
  }

  const domain = getUrlDomain(normalizedUrl);

  if (!domain || isBlockedDomain(domain)) {
    return false;
  }

  const combinedContent = [
    title,
    article.description ?? "",
    article.content ?? "",
  ].join(" ");

  return !containsBlockedContent(combinedContent);
}

function sortCandidates(
  candidates: CandidateArticle[]
): CandidateArticle[] {
  return [...candidates].sort((left, right) => {
    if (
      right.importanceScore !==
      left.importanceScore
    ) {
      return (
        right.importanceScore -
        left.importanceScore
      );
    }

    return (
      new Date(right.publishedAt).getTime() -
      new Date(left.publishedAt).getTime()
    );
  });
}

/* -------------------------------------------------------------------------- */
/* Candidate preparation                                                      */
/* -------------------------------------------------------------------------- */

export function prepareNewsCandidates(
  articles: NewsApiArticle[]
): CandidateArticle[] {
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

    if (
      !sourceUrl ||
      !domain ||
      seenUrls.has(sourceUrl)
    ) {
      continue;
    }

    const sourceName =
      normalizeText(article.source?.name, 80) || domain;

    const originalTitle = cleanArticleTitle(
      article.title,
      sourceName
    );

    const titleKey = normalizedTitleKey(originalTitle);

    if (
      !originalTitle ||
      !titleKey ||
      seenTitles.has(titleKey) ||
      containsBlockedContent(originalTitle)
    ) {
      continue;
    }

    const rawDescription =
      article.description ||
      article.content ||
      originalTitle;

    const description = cleanDescription(rawDescription);

    if (
      containsBlockedContent(
        `${originalTitle} ${description}`
      )
    ) {
      continue;
    }

    const currentSourceCount =
      sourceCounts.get(domain) ?? 0;

    if (
      currentSourceCount >=
      MAX_ARTICLES_PER_SOURCE
    ) {
      continue;
    }

    const publishedAt = normalizePublishedAt(
      article.publishedAt
    );

    const imageUrl = normalizeImageUrl(
      article.urlToImage
    );

    const candidate: CandidateArticle = {
      articleId: createStableId(sourceUrl),
      categoryHint: inferCategory(
        originalTitle,
        description
      ),
      originalTitle,
      description: description || originalTitle,
      sourceName,
      sourceUrl,
      publishedAt,
      imageUrl,
      domain,
      trustedSource: isTrustedDomain(domain),
      importanceScore: calculateImportanceScore(
        originalTitle,
        description,
        domain,
        publishedAt,
        Boolean(imageUrl)
      ),
    };

    if (candidate.trustedSource) {
      trustedCandidates.push(candidate);
    } else if (isAcceptableSecondaryDomain(domain)) {
      secondaryCandidates.push(candidate);
    } else {
      continue;
    }

    seenUrls.add(sourceUrl);
    seenTitles.add(titleKey);
    sourceCounts.set(
      domain,
      currentSourceCount + 1
    );
  }

  const trusted = sortCandidates(trustedCandidates);
  const secondary = sortCandidates(secondaryCandidates);

  return [...trusted, ...secondary].slice(
    0,
    MAX_NEWS_CANDIDATES
  );
}

/* -------------------------------------------------------------------------- */
/* NewsAPI requests                                                           */
/* -------------------------------------------------------------------------- */

async function requestNewsApi(
  endpoint: "top-headlines" | "everything",
  parameters: URLSearchParams
): Promise<NewsApiArticle[]> {
  const newsApiKey = process.env.NEWS_API_KEY?.trim();

  if (!newsApiKey) {
    throw new Error("NEWS_API_KEY_MISSING");
  }

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    NEWS_TIMEOUT_MS
  );

  try {
    const response = await fetch(
      `https://newsapi.org/v2/${endpoint}?${parameters.toString()}`,
      {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "X-Api-Key": newsApiKey,
        },
      }
    );

    let payload: NewsApiResponse;

    try {
      payload = (await response.json()) as NewsApiResponse;
    } catch {
      throw new Error(
        `NEWS_API_INVALID_RESPONSE:${response.status}`
      );
    }

    if (
      !response.ok ||
      payload.status !== "ok"
    ) {
      const errorCode =
        "code" in payload
          ? payload.code
          : String(response.status);

      const errorMessage =
        "message" in payload
          ? payload.message
          : "Unable to retrieve news.";

      throw new Error(
        `NEWS_API_ERROR:${errorCode ?? response.status}:${
          errorMessage ?? "Unable to retrieve news."
        }`
      );
    }

    return Array.isArray(payload.articles)
      ? payload.articles
      : [];
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw new Error("NEWS_API_TIMEOUT");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTopHeadlines(): Promise<
  NewsApiArticle[]
> {
  const parameters = new URLSearchParams({
    country: TOP_HEADLINES_COUNTRY,
    pageSize: String(NEWS_API_PAGE_SIZE),
  });

  return requestNewsApi(
    "top-headlines",
    parameters
  );
}

async function fetchEverything(): Promise<
  NewsApiArticle[]
> {
  const threeDaysAgo = new Date(
    Date.now() - 3 * 24 * 60 * 60 * 1000
  ).toISOString();

  const parameters = new URLSearchParams({
    q: `(${NEWS_QUERY})`,
    searchIn: "title,description",
    language: NEWS_LANGUAGE,
    sortBy: "publishedAt",
    from: threeDaysAgo,
    pageSize: String(NEWS_API_PAGE_SIZE),
  });

  return requestNewsApi(
    "everything",
    parameters
  );
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export async function fetchNewsCandidates(): Promise<
  CandidateArticle[]
> {
  let topHeadlines: NewsApiArticle[] = [];

  try {
    topHeadlines = await fetchTopHeadlines();
  } catch (error) {
    console.warn(
      "Top-headlines request failed; trying Everything:",
      error instanceof Error ? error.message : error
    );
  }

  const topCandidates =
    prepareNewsCandidates(topHeadlines);

  if (topCandidates.length >= MAX_CARD_POOL) {
    return topCandidates;
  }

  const everythingArticles = await fetchEverything();

  const candidates = prepareNewsCandidates([
    ...topHeadlines,
    ...everythingArticles,
  ]);

  if (candidates.length === 0) {
    throw new Error("NO_SUITABLE_NEWS");
  }

  return candidates;
}