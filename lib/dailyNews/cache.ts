import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  NEWS_CACHE_MINUTES,
  NEWS_STALE_MINUTES,
} from "./config";

import type {
  CachedNews,
  DailyNewsCard,
  VocabularyItem,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type DailyNewsCacheRow = {
  id: number;
  cards: unknown;
  generated_at: string;
  fresh_until: string;
  stale_until: string;
  updated_at: string;
};

export type DailyNewsCacheState =
  | "fresh"
  | "stale"
  | "expired"
  | "missing";

export type DailyNewsCacheResult = {
  state: DailyNewsCacheState;
  cache: CachedNews | null;
};

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const CACHE_TABLE = "daily_news_cache";
const CACHE_ROW_ID = 1;

/*
 * Reuse one administrative client inside the same warm server process.
 * This client must never be imported into a Client Component.
 */
let adminClient: SupabaseClient | null = null;

/* -------------------------------------------------------------------------- */
/* Supabase client                                                            */
/* -------------------------------------------------------------------------- */

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name}_MISSING`);
  }

  return value;
}

function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim();

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL_MISSING");
  }

  /*
   * Supports the legacy service-role key used by your current setup.
   * The fallback name also makes a later migration to Supabase's newer
   * server-side secret-key naming easier.
   */
  const serverKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();

  if (!serverKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY_MISSING");
  }

  adminClient = createClient(supabaseUrl, serverKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "X-Client-Info": "exchange-notes-daily-news-cache",
      },
    },
  });

  return adminClient;
}

/* -------------------------------------------------------------------------- */
/* Runtime validation                                                         */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isValidIsoDate(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}

function isValidVocabularyItem(
  value: unknown
): value is VocabularyItem {
  if (!isRecord(value)) {
    return false;
  }

  const validPartsOfSpeech = new Set([
    "noun",
    "verb",
    "adjective",
    "adverb",
    "phrase",
  ]);

  return (
    typeof value.word === "string" &&
    value.word.trim().length > 0 &&
    typeof value.translation === "string" &&
    value.translation.trim().length > 0 &&
    typeof value.partOfSpeech === "string" &&
    validPartsOfSpeech.has(value.partOfSpeech) &&
    typeof value.englishExample === "string" &&
    value.englishExample.trim().length > 0 &&
    typeof value.chineseExample === "string" &&
    value.chineseExample.trim().length > 0
  );
}

function isValidDailyNewsCard(
  value: unknown
): value is DailyNewsCard {
  if (!isRecord(value)) {
    return false;
  }

  const validCategories = new Set([
    "World",
    "Politics",
    "Business",
    "Technology",
    "Science",
    "Climate",
    "Health",
    "Culture",
  ]);

  if (
    typeof value.id !== "string" ||
    value.id.trim().length === 0 ||
    typeof value.category !== "string" ||
    !validCategories.has(value.category) ||
    typeof value.englishTitle !== "string" ||
    value.englishTitle.trim().length === 0 ||
    typeof value.chineseTitle !== "string" ||
    typeof value.englishSummary !== "string" ||
    value.englishSummary.trim().length === 0 ||
    typeof value.chineseSummary !== "string" ||
    typeof value.sourceName !== "string" ||
    value.sourceName.trim().length === 0 ||
    typeof value.sourceUrl !== "string" ||
    !isValidHttpUrl(value.sourceUrl) ||
    typeof value.publishedAt !== "string" ||
    !isValidIsoDate(value.publishedAt) ||
    !Array.isArray(value.vocabulary) ||
    typeof value.aiEnhanced !== "boolean"
  ) {
    return false;
  }

  if (
    value.imageUrl !== null &&
    (typeof value.imageUrl !== "string" ||
      !isValidHttpUrl(value.imageUrl))
  ) {
    return false;
  }

  return value.vocabulary.every(isValidVocabularyItem);
}

function validateCards(value: unknown): DailyNewsCard[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const cards = value.filter(isValidDailyNewsCard);

  /*
   * Do not partially accept corrupted cache payloads.
   * If any stored card fails validation, treat the whole cache as invalid.
   */
  if (cards.length !== value.length) {
    return [];
  }

  return cards;
}

function normalizeCacheRow(
  row: DailyNewsCacheRow
): CachedNews | null {
  const cards = validateCards(row.cards);

  if (
    cards.length === 0 ||
    !isValidIsoDate(row.generated_at) ||
    !isValidIsoDate(row.fresh_until) ||
    !isValidIsoDate(row.stale_until)
  ) {
    return null;
  }

  return {
    cards,
    generatedAt: new Date(row.generated_at).toISOString(),
    freshUntil: new Date(row.fresh_until).toISOString(),
    staleUntil: new Date(row.stale_until).toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/* Cache-state helpers                                                        */
/* -------------------------------------------------------------------------- */

export function getCacheState(
  cache: CachedNews | null,
  now = new Date()
): DailyNewsCacheState {
  if (!cache || cache.cards.length === 0) {
    return "missing";
  }

  const nowTime = now.getTime();
  const freshUntil = new Date(cache.freshUntil).getTime();
  const staleUntil = new Date(cache.staleUntil).getTime();

  if (
    Number.isNaN(freshUntil) ||
    Number.isNaN(staleUntil)
  ) {
    return "expired";
  }

  if (nowTime < freshUntil) {
    return "fresh";
  }

  if (nowTime < staleUntil) {
    return "stale";
  }

  return "expired";
}

export function isFreshCache(
  cache: CachedNews | null
): cache is CachedNews {
  return getCacheState(cache) === "fresh";
}

export function isUsableCache(
  cache: CachedNews | null
): cache is CachedNews {
  const state = getCacheState(cache);

  return state === "fresh" || state === "stale";
}

/* -------------------------------------------------------------------------- */
/* Read                                                                       */
/* -------------------------------------------------------------------------- */

export async function readDailyNewsCache(): Promise<CachedNews | null> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from(CACHE_TABLE)
    .select(
      "id, cards, generated_at, fresh_until, stale_until, updated_at"
    )
    .eq("id", CACHE_ROW_ID)
    .maybeSingle();

  if (error) {
    throw new Error(`DAILY_NEWS_CACHE_READ_FAILED:${error.message}`);
  }

  if (!data) {
    return null;
  }

  return normalizeCacheRow(data as DailyNewsCacheRow);
}

export async function inspectDailyNewsCache(): Promise<DailyNewsCacheResult> {
  const cache = await readDailyNewsCache();

  return {
    cache,
    state: getCacheState(cache),
  };
}

/* -------------------------------------------------------------------------- */
/* Write                                                                      */
/* -------------------------------------------------------------------------- */

export async function writeDailyNewsCache(
  cards: DailyNewsCard[],
  generatedAt = new Date()
): Promise<CachedNews> {
  if (cards.length === 0) {
    throw new Error("DAILY_NEWS_CACHE_EMPTY_CARDS");
  }

  if (!cards.every(isValidDailyNewsCard)) {
    throw new Error("DAILY_NEWS_CACHE_INVALID_CARDS");
  }

  const generatedTime = generatedAt.getTime();

  if (Number.isNaN(generatedTime)) {
    throw new Error("DAILY_NEWS_CACHE_INVALID_GENERATED_AT");
  }

  const freshUntil = new Date(
    generatedTime + NEWS_CACHE_MINUTES * 60_000
  );

  /*
   * Stale time begins at generation time, matching the current config.
   * Example: fresh for 45 minutes, usable stale for up to 6 hours.
   */
  const staleUntil = new Date(
    generatedTime + NEWS_STALE_MINUTES * 60_000
  );

  if (staleUntil.getTime() <= freshUntil.getTime()) {
    throw new Error(
      "DAILY_NEWS_CACHE_STALE_WINDOW_MUST_EXCEED_FRESH_WINDOW"
    );
  }

  const payload = {
    id: CACHE_ROW_ID,
    cards,
    generated_at: generatedAt.toISOString(),
    fresh_until: freshUntil.toISOString(),
    stale_until: staleUntil.toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from(CACHE_TABLE)
    .upsert(payload, {
      onConflict: "id",
      ignoreDuplicates: false,
    })
    .select(
      "id, cards, generated_at, fresh_until, stale_until, updated_at"
    )
    .single();

  if (error) {
    throw new Error(`DAILY_NEWS_CACHE_WRITE_FAILED:${error.message}`);
  }

  const normalized = normalizeCacheRow(data as DailyNewsCacheRow);

  if (!normalized) {
    throw new Error("DAILY_NEWS_CACHE_WRITE_RETURNED_INVALID_DATA");
  }

  return normalized;
}

/* -------------------------------------------------------------------------- */
/* Delete/reset                                                               */
/* -------------------------------------------------------------------------- */

export async function clearDailyNewsCache(): Promise<void> {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from(CACHE_TABLE)
    .delete()
    .eq("id", CACHE_ROW_ID);

  if (error) {
    throw new Error(`DAILY_NEWS_CACHE_CLEAR_FAILED:${error.message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* Environment diagnostics                                                    */
/* -------------------------------------------------------------------------- */

export function assertDailyNewsCacheEnvironment(): void {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim();

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL_MISSING");
  }

  getRequiredEnvironmentVariable(
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
      ? "SUPABASE_SERVICE_ROLE_KEY"
      : "SUPABASE_SECRET_KEY"
  );
}