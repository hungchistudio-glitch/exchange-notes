import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { VocabularyLookupResult } from "@/lib/types/vocabularyLookup";
import { lookupOffline } from "@/lib/vocabulary/offlineLookup";
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

const resultCache = new Map<string, CacheEntry>();
const inFlightLookups = new Map<string, Promise<VocabularyLookupResult>>();
const modelCooldowns = new Map<string, number>();

function normalizeQuery(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

function getCacheKey(query: string) {
  return query.toLocaleLowerCase("en-US");
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

function isVocabularyLookupResult(value: unknown): value is VocabularyLookupResult {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  const stringFields = [
    "englishName",
    "chineseName",
    "partOfSpeech",
    "englishExample",
    "chineseExample",
  ];

  return (
    stringFields.every(
      (field) =>
        typeof candidate[field] === "string" &&
        (candidate[field] as string).trim().length > 0,
    ) &&
    ["high", "medium", "low"].includes(String(candidate.confidence)) &&
    ["people", "objects", "actions", "other"].includes(String(candidate.category))
  );
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
) {
  const interaction = await client.interactions.create(
    {
      model,
      input: `
The user typed this into an English and Traditional Chinese language-learning
app: ${JSON.stringify(query)}

It may be an English word/phrase, a Traditional Chinese word/phrase, or a
misspelling of either. Identify what it most likely means and return the
requested fields.

Rules:
- Use Traditional Chinese, never Simplified Chinese.
- If the input is already Traditional Chinese, treat it as the source word
  and translate it into English.
- If uncertain what was meant, make your best guess and use low confidence.
- Keep both examples natural, short, and semantically equivalent.
      `.trim(),
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

async function lookupWithModelFallback(query: string) {
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
      return await lookupWithModel(client, model, query);
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

async function performLookup(query: string) {
  const modelResult = await lookupWithModelFallback(query);
  return modelResult ?? lookupOffline(query);
}

async function lookupVocabulary(query: string) {
  const key = getCacheKey(query);
  const cached = getCachedResult(key);
  if (cached) return cached;

  const existingRequest = inFlightLookups.get(key);
  if (existingRequest) return existingRequest;

  const request = performLookup(query)
    .then((result) => {
      cacheResult(key, result);
      return result;
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

    const result = await lookupVocabulary(query);
    return NextResponse.json(result);
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
