/**
 * Daily News V2 configuration
 *
 * Keep this file free of API keys and secrets.
 * Environment variables belong in `.env.local` and Vercel.
 */

/* -------------------------------------------------------------------------- */
/* Cache                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * How long generated news remains fresh.
 */
export const NEWS_CACHE_MINUTES = 45;

/**
 * How long older cached news may be used when external services fail.
 */
export const NEWS_STALE_MINUTES = 6 * 60;

/* -------------------------------------------------------------------------- */
/* Feed size                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Maximum number of processed cards stored in the shared cache.
 */
export const MAX_CARD_POOL = 8;

/**
 * Number of cards returned to the user per request.
 */
export const RESPONSE_CARD_COUNT = 3;

/**
 * Maximum number of raw candidates passed to the AI-processing layer.
 */
export const MAX_NEWS_CANDIDATES = 12;

/**
 * Maximum number of articles accepted from the same publisher.
 */
export const MAX_ARTICLES_PER_SOURCE = 2;

/**
 * Maximum number of articles requested from NewsAPI per endpoint.
 */
export const NEWS_API_PAGE_SIZE = 100;

/* -------------------------------------------------------------------------- */
/* Timeouts                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Maximum time allowed for a NewsAPI request.
 */
export const NEWS_TIMEOUT_MS = 12_000;

/**
 * Maximum time allowed for Gemini learning-content generation.
 */
export const GEMINI_TIMEOUT_MS = 35_000;

/* -------------------------------------------------------------------------- */
/* NewsAPI search                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Search terms used by NewsAPI's `/v2/everything` endpoint.
 *
 * Multi-word topics are quoted so they remain intact.
 */
export const NEWS_SEARCH_TERMS = [
  '"international"',
  '"world affairs"',
  '"government"',
  '"election"',
  '"economy"',
  '"central bank"',
  '"technology"',
  '"artificial intelligence"',
  '"science"',
  '"climate"',
  '"public health"',
] as const;

/**
 * Final NewsAPI query string.
 */
export const NEWS_QUERY = NEWS_SEARCH_TERMS.join(" OR ");

/**
 * NewsAPI language used for the learning feed.
 */
export const NEWS_LANGUAGE = "en";

/**
 * Country used for the first top-headlines request.
 */
export const TOP_HEADLINES_COUNTRY = "us";

/* -------------------------------------------------------------------------- */
/* Source quality                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Preferred publishers and primary institutions.
 *
 * Only domain names belong here.
 * Search keywords and regular expressions must never be added to this list.
 */
export const TRUSTED_DOMAINS = [
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
] as const;

/**
 * Domains that should never appear in the feed.
 */
export const BLOCKED_DOMAINS = [
  "slashdot.org",
  "yahoo.com",
  "news.yahoo.com",
  "msn.com",
  "news.google.com",
  "google.com",
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "reddit.com",
  "medium.com",
  "substack.com",
  "blogspot.com",
  "wordpress.com",
  "pinterest.com",
  "youtube.com",
] as const;

/* -------------------------------------------------------------------------- */
/* Learning output                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Number of vocabulary items generated for each AI-enhanced article.
 */
export const VOCABULARY_ITEMS_PER_CARD = 3;

/**
 * Target English-learning level.
 */
export const TARGET_CEFR_LEVEL = "B1-B2";

/**
 * Supported news categories.
 */
export const NEWS_CATEGORIES = [
  "World",
  "Politics",
  "Business",
  "Technology",
  "Science",
  "Climate",
  "Health",
  "Culture",
] as const;

/**
 * Supported vocabulary parts of speech.
 */
export const PARTS_OF_SPEECH = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "phrase",
] as const;