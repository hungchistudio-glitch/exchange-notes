import {
  MAX_CARD_POOL,
  RESPONSE_CARD_COUNT,
} from "./config";

import {
  inspectDailyNewsCache,
  isUsableCache,
  writeDailyNewsCache,
} from "./cache";

import {
  fetchNewsCandidates,
  type CandidateArticle,
} from "./newsApi";

import { enrichNewsWithGemini } from "./gemini";

import type {
  CachedNews,
  DailyNewsCard,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Public types                                                               */
/* -------------------------------------------------------------------------- */

export type DailyNewsGenerationSource =
  | "generated"
  | "fresh-cache"
  | "stale-cache"
  | "fallback";

export type RefreshDailyNewsResult = {
  cards: DailyNewsCard[];
  generatedAt: string;
  source: DailyNewsGenerationSource;
  aiEnhanced: boolean;
};

export type GetDailyNewsOptions = {
  forceRefresh?: boolean;
  allowStale?: boolean;
};

/* -------------------------------------------------------------------------- */
/* In-flight request protection                                               */
/* -------------------------------------------------------------------------- */

/*
 * Multiple requests arriving on the same warm server instance
 * share one generation job instead of calling NewsAPI and Gemini repeatedly.
 */
let inFlightGeneration:
  | Promise<RefreshDailyNewsResult>
  | null = null;

/* -------------------------------------------------------------------------- */
/* General helpers                                                            */
/* -------------------------------------------------------------------------- */

function normalizeText(
  value: string,
  maximumLength: number
): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength);
}

function createFallbackSummary(
  candidate: CandidateArticle
): string {
  const description = normalizeText(
    candidate.description,
    360
  );

  if (description) {
    return description;
  }

  return normalizeText(
    candidate.originalTitle,
    240
  );
}

function createFallbackCards(
  candidates: CandidateArticle[]
): DailyNewsCard[] {
  return candidates
    .slice(0, MAX_CARD_POOL)
    .map((candidate) => ({
      id: candidate.articleId,
      category: candidate.categoryHint,

      englishTitle: normalizeText(
        candidate.originalTitle,
        120
      ),

      /*
       * Empty Chinese fields are intentional.
       * The UI should hide them when AI enhancement is unavailable.
       */
      chineseTitle: "",

      englishSummary:
        createFallbackSummary(candidate),

      chineseSummary: "",

      sourceName: normalizeText(
        candidate.sourceName,
        80
      ),

      sourceUrl: candidate.sourceUrl,
      publishedAt: candidate.publishedAt,
      imageUrl: candidate.imageUrl,

      vocabulary: [],
      aiEnhanced: false,
    }));
}

function deduplicateCards(
  cards: DailyNewsCard[]
): DailyNewsCard[] {
  const byId = new Map<
    string,
    DailyNewsCard
  >();

  for (const card of cards) {
    if (!card.id || byId.has(card.id)) {
      continue;
    }

    byId.set(card.id, card);
  }

  return Array.from(
    byId.values()
  ).slice(0, MAX_CARD_POOL);
}

function mergeEnhancedAndFallbackCards(
  enhancedCards: DailyNewsCard[],
  fallbackCards: DailyNewsCard[]
): DailyNewsCard[] {
  const enhancedIds = new Set(
    enhancedCards.map((card) => card.id)
  );

  return deduplicateCards([
    ...enhancedCards,
    ...fallbackCards.filter(
      (card) => !enhancedIds.has(card.id)
    ),
  ]);
}

function validateMinimumCardCount(
  cards: DailyNewsCard[]
): void {
  if (
    cards.length <
    RESPONSE_CARD_COUNT
  ) {
    throw new Error(
      "DAILY_NEWS_TOO_FEW_CARDS"
    );
  }
}

function createResult(
  cards: DailyNewsCard[],
  generatedAt: string,
  source: DailyNewsGenerationSource
): RefreshDailyNewsResult {
  validateMinimumCardCount(cards);

  return {
    cards,
    generatedAt,
    source,
    aiEnhanced: cards.some(
      (card) => card.aiEnhanced
    ),
  };
}

function resultFromCache(
  cache: CachedNews,
  source:
    | "fresh-cache"
    | "stale-cache"
): RefreshDailyNewsResult {
  return createResult(
    cache.cards,
    cache.generatedAt,
    source
  );
}

/* -------------------------------------------------------------------------- */
/* AI and fallback generation                                                 */
/* -------------------------------------------------------------------------- */

async function generateCardPool(): Promise<
  DailyNewsCard[]
> {
  const candidates =
    await fetchNewsCandidates();

  if (
    candidates.length <
    RESPONSE_CARD_COUNT
  ) {
    throw new Error(
      "NO_SUITABLE_NEWS"
    );
  }

  const fallbackCards =
    createFallbackCards(candidates);

  try {
    const enhancedCards =
      await enrichNewsWithGemini(
        candidates
      );

    const mergedCards =
      mergeEnhancedAndFallbackCards(
        enhancedCards,
        fallbackCards
      );

    validateMinimumCardCount(
      mergedCards
    );

    return mergedCards;
  } catch (error) {
    console.warn(
      "Gemini enhancement unavailable; using NewsAPI fallback:",
      error instanceof Error
        ? error.message
        : error
    );

    validateMinimumCardCount(
      fallbackCards
    );

    return fallbackCards;
  }
}

/* -------------------------------------------------------------------------- */
/* Cache refresh                                                              */
/* -------------------------------------------------------------------------- */

async function performRefresh(): Promise<
  RefreshDailyNewsResult
> {
  /*
   * Read the previous cache before generating.
   * If external services fail, it may still be used as a stale fallback.
   */
  let previousCache:
    | CachedNews
    | null = null;

  try {
    const inspection =
      await inspectDailyNewsCache();

    previousCache =
      inspection.cache;
  } catch (error) {
    console.warn(
      "Unable to inspect previous Daily News cache:",
      error instanceof Error
        ? error.message
        : error
    );
  }

  try {
    const cards =
      await generateCardPool();

    const generatedAt =
      new Date();

    const storedCache =
      await writeDailyNewsCache(
        cards,
        generatedAt
      );

    return createResult(
      storedCache.cards,
      storedCache.generatedAt,
      cards.some(
        (card) => card.aiEnhanced
      )
        ? "generated"
        : "fallback"
    );
  } catch (error) {
    /*
     * If fresh generation fails completely, return an existing usable cache.
     * This keeps the product alive during NewsAPI, Gemini, or network failure.
     */
    if (
      previousCache &&
      isUsableCache(previousCache)
    ) {
      console.warn(
        "Daily News refresh failed; returning existing cache:",
        error instanceof Error
          ? error.message
          : error
      );

      return resultFromCache(
        previousCache,
        "stale-cache"
      );
    }

    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* Public refresh API                                                         */
/* -------------------------------------------------------------------------- */

export async function refreshDailyNews(): Promise<
  RefreshDailyNewsResult
> {
  if (!inFlightGeneration) {
    inFlightGeneration =
      performRefresh().finally(() => {
        inFlightGeneration = null;
      });
  }

  return inFlightGeneration;
}

/* -------------------------------------------------------------------------- */
/* Public read API                                                            */
/* -------------------------------------------------------------------------- */

export async function getDailyNews(
  options: GetDailyNewsOptions = {}
): Promise<RefreshDailyNewsResult> {
  const {
    forceRefresh = false,
    allowStale = true,
  } = options;

  if (!forceRefresh) {
    try {
      const inspection =
        await inspectDailyNewsCache();

      if (
        inspection.state ===
          "fresh" &&
        inspection.cache
      ) {
        return resultFromCache(
          inspection.cache,
          "fresh-cache"
        );
      }

      if (
        allowStale &&
        inspection.state ===
          "stale" &&
        inspection.cache
      ) {
        /*
         * Return stale content immediately, then refresh in the background.
         * This keeps the user-facing request fast.
         */
        void refreshDailyNews().catch(
          (error) => {
            console.error(
              "Background Daily News refresh failed:",
              error instanceof Error
                ? error.message
                : error
            );
          }
        );

        return resultFromCache(
          inspection.cache,
          "stale-cache"
        );
      }
    } catch (error) {
      console.warn(
        "Daily News cache read failed; generating a fresh feed:",
        error instanceof Error
          ? error.message
          : error
      );
    }
  }

  return refreshDailyNews();
}