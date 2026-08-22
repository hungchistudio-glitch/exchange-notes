import { buildClassifyTextPrompt } from "@/lib/ai/prompts/classifyText";
import type { LanguageCode } from "@/lib/languages";
import { readLearningPair } from "@/lib/profile/languagePair";
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { VocabularyLookupResult } from "@/lib/types/vocabularyLookup";
import { isVocabularyLookupResult } from "@/lib/types/vocabularyLookup";
import { lookupOffline } from "@/lib/vocabulary/offlineLookup";
import {
  readSharedLookupCache,
  writeSharedLookupCache,
} from "@/lib/vocabulary/sharedLookupCache";
import {
  getTextModelCandidates,
  readBoundedInteger,
} from "@/lib/ai/modelConfig";

export const runtime = "nodejs";

const MAX_QUERY_LENGTH = 80;
const MEMORY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MEMORY_CACHE_MAX_ITEMS = 500;
const MODEL_COOLDOWN_MS = 65 * 1000;
const REQUEST_TIMEOUT_MS = readBoundedInteger(
  process.env.TEXT_REQUEST_TIMEOUT_MS,
  6_000,
  2_000,
  20_000,
);

const TEXT_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    englishName: { type: "string", minLength: 1, maxLength: 80 },
    chineseName: { type: "string", minLength: 1, maxLength: 80 },
    partOfSpeech: {
      type: "string",
      enum: ["noun", "verb", "adjective", "phrase", "other"],
    },
    englishExample: { type: "string", minLength: 4, maxLength: 200 },
    chineseExample: { type: "string", minLength: 2, maxLength: 200 },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    category: {
      type: "string",
      enum: ["people", "objects", "actions", "other"],
    },
  },
  required: [
    "englishName",
    "chineseName",
    "partOfSpeech",
    "englishExample",
    "chineseExample",
    "confidence",
    "category",
  ],
};

type CacheEntry = {
  expiresAt: number;
  result: VocabularyLookupResult;
};

type ResolvedLookup = {
  result: VocabularyLookupResult;
  /** "memory", "shared", "offline", or the model id that produced it. */
  origin: string;
  /**
   * Whether a model produced this. Offline fallbacks carry canned template
   * sentences, so they are returned but never cached — otherwise a momentary
   * Gemini outage would outlive itself in every cache layer.
   */
  fromModel: boolean;
};

const resultCache = new Map<string, CacheEntry>();
const inFlightLookups = new Map<string, Promise<ResolvedLookup>>();
const modelCooldowns = new Map<string, number>();

function normalizeQuery(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

/**
 * The cache key is the query *and* the pair it was answered in.
 *
 * Both caches here are shared — the in-memory one across every request an
 * instance serves, the table across the whole app — and the answer is no
 * longer the same for everyone. Keyed on the query alone, the first person to
 * look up "bicycle" would decide what everyone else got back, in their
 * language rather than the asker's.
 *
 * Old rows keyed without a pair simply never match again and age out; a
 * cache miss costs a lookup, which is the failure this module is built to
 * take. A query long enough to push the key past the column's 80-character
 * ceiling skips the shared cache the same way — see MAX_KEY_LENGTH there.
 */
function getCacheKey(
  query: string,
  [learning, native]: readonly [LanguageCode, LanguageCode],
) {
  return `${learning}+${native}:${query.toLocaleLowerCase("en-US")}`;
}

function getCachedResult(key: string) {
  const cached = resultCache.get(key);

  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    resultCache.delete(key);
    return null;
  }

  // Refresh insertion order so frequently used words remain in the LRU cache.
  resultCache.delete(key);
  resultCache.set(key, cached);
  return cached.result;
}

function cacheResult(key: string, result: VocabularyLookupResult) {
  resultCache.set(key, {
    expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
    result,
  });

  while (resultCache.size > MEMORY_CACHE_MAX_ITEMS) {
    const oldestKey = resultCache.keys().next().value;
    if (typeof oldestKey !== "string") break;
    resultCache.delete(oldestKey);
  }
}

function stripJsonCodeFence(text: string) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== "object") return null;

  const candidate = error as {
    status?: unknown;
    statusCode?: unknown;
  };
  const status = candidate.status ?? candidate.statusCode;
  return typeof status === "number" ? status : null;
}

function isRateLimitError(error: unknown) {
  if (getErrorStatus(error) === 429) return true;
  return error instanceof Error && /quota|rate.?limit|too many requests/i.test(error.message);
}

async function lookupWithModel(
  client: GoogleGenAI,
  model: string,
  query: string,
  languagePair: readonly [LanguageCode, LanguageCode],
) {
  const interaction = await client.interactions.create(
    {
      model,
      input: buildClassifyTextPrompt(query, languagePair),
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: TEXT_RESULT_SCHEMA,
      },
      generation_config: {
        thinking_level: "low",
      },
      store: false,
    },
    {
      maxRetries: 0,
      timeout: REQUEST_TIMEOUT_MS,
    },
  );

  const outputText =
    typeof interaction.output_text === "string"
      ? interaction.output_text
      : "";

  if (!outputText.trim()) {
    throw new Error("Gemini returned an empty response.");
  }

  const result = JSON.parse(stripJsonCodeFence(outputText)) as unknown;

  if (!isVocabularyLookupResult(result)) {
    throw new Error("Gemini returned an invalid vocabulary result.");
  }

  return result;
}

async function lookupWithModelFallback(
  query: string,
  languagePair: readonly [LanguageCode, LanguageCode],
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const client = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: REQUEST_TIMEOUT_MS,
      retryOptions: { attempts: 1 },
    },
  });

  for (const model of getTextModelCandidates()) {
    const cooldownUntil = modelCooldowns.get(model) ?? 0;
    if (cooldownUntil > Date.now()) continue;

    try {
      const result = await lookupWithModel(client, model, query, languagePair);
      return { result, model };
    } catch (error) {
      const status = getErrorStatus(error);

      if (isRateLimitError(error)) {
        modelCooldowns.set(model, Date.now() + MODEL_COOLDOWN_MS);
      }

      console.warn("Vocabulary model unavailable; trying fallback.", {
        model,
        status,
        reason: isRateLimitError(error) ? "rate_limit" : "model_error",
      });
    }
  }

  return null;
}

async function performLookup(
  query: string,
  key: string,
  languagePair: readonly [LanguageCode, LanguageCode],
): Promise<ResolvedLookup> {
  // Any word another user has already looked up costs nothing and returns in
  // a single round trip, so this runs ahead of the model.
  const shared = await readSharedLookupCache(key);
  if (shared) {
    return { result: shared, origin: "shared", fromModel: true };
  }

  const modelResult = await lookupWithModelFallback(query, languagePair);
  if (modelResult) {
    // Not awaited: persisting for other users must not delay this response,
    // and a cache that cannot be written is not a failed lookup.
    void writeSharedLookupCache(key, modelResult.result, modelResult.model);

    return {
      result: modelResult.result,
      origin: modelResult.model,
      fromModel: true,
    };
  }

  return {
    result: await lookupOffline(query),
    origin: "offline",
    fromModel: false,
  };
}

async function lookupVocabulary(
  query: string,
  languagePair: readonly [LanguageCode, LanguageCode],
): Promise<ResolvedLookup> {
  const key = getCacheKey(query, languagePair);

  const cached = getCachedResult(key);
  if (cached) return { result: cached, origin: "memory", fromModel: true };

  const existingRequest = inFlightLookups.get(key);
  if (existingRequest) return existingRequest;

  const request = performLookup(query, key, languagePair)
    .then((resolved) => {
      if (resolved.fromModel) cacheResult(key, resolved.result);
      return resolved;
    })
    .finally(() => {
      inFlightLookups.delete(key);
    });

  inFlightLookups.set(key, request);
  return request;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in before looking up a word." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as { text?: string };
    const query = normalizeQuery(body.text ?? "");

    if (!query) {
      return NextResponse.json(
        { error: "Please provide a word or phrase to look up." },
        { status: 400 },
      );
    }

    if (query.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `Please keep the word or phrase under ${MAX_QUERY_LENGTH} characters.` },
        { status: 400 },
      );
    }

    const languagePair = await readLearningPair(supabase, user.id);

    const resolved = await lookupVocabulary(query, languagePair);

    return NextResponse.json(
      {
        ...resolved.result,
        // Tells the client this is the offline dictionary's canned example
        // rather than a real one, so it can say so and offer a retry instead
        // of passing the degraded copy off as a normal result.
        degraded: !resolved.fromModel,
      },
      {
        headers: {
          // Lets cache effectiveness be read straight off a response rather
          // than inferred from billing.
          "X-Lookup-Source": resolved.origin,
        },
      },
    );
  } catch (error) {
    console.error("Vocabulary lookup route failed:", {
      status: getErrorStatus(error),
      name: error instanceof Error ? error.name : "UnknownError",
    });

    return NextResponse.json(
      { error: "Couldn't look up that word. Please try again." },
      { status: 500 },
    );
  }
}
