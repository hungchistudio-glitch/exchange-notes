import { buildIdentifyObjectPrompt } from "@/lib/ai/prompts/identifyObject";
import type { LanguageCode } from "@/lib/languages";
import { createHash } from "node:crypto";

import { GoogleGenAI } from "@google/genai";
import {
  getVisionModelCandidates,
  readBoundedInteger,
} from "@/lib/ai/modelConfig";

export type ObjectIdentificationResult = {
  englishName: string;
  chineseName: string;
  partOfSpeech: "noun" | "verb" | "adjective" | "phrase" | "other";
  englishExample: string;
  chineseExample: string;
  confidence: "high" | "medium" | "low";
};

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_MAX_ITEMS = 200;
const MODEL_COOLDOWN_MS = 65 * 1000;
const REQUEST_TIMEOUT_MS = readBoundedInteger(
  process.env.VISION_REQUEST_TIMEOUT_MS,
  8_000,
  3_000,
  20_000,
);

const OBJECT_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    englishName: { type: "string", minLength: 1, maxLength: 80 },
    chineseName: { type: "string", minLength: 1, maxLength: 80 },
    partOfSpeech: {
      type: "string",
      enum: ["noun", "verb", "adjective", "phrase", "other"],
    },
    englishExample: { type: "string", minLength: 4, maxLength: 160 },
    chineseExample: { type: "string", minLength: 2, maxLength: 160 },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
  },
  required: [
    "englishName",
    "chineseName",
    "partOfSpeech",
    "englishExample",
    "chineseExample",
    "confidence",
  ],
};

type CacheEntry = {
  expiresAt: number;
  result: ObjectIdentificationResult;
};

const resultCache = new Map<string, CacheEntry>();
const inFlightIdentifications = new Map<
  string,
  Promise<ObjectIdentificationResult>
>();
const modelCooldowns = new Map<string, number>();

export class ObjectIdentificationUnavailableError extends Error {
  constructor() {
    super("All object-identification models are temporarily unavailable.");
    this.name = "ObjectIdentificationUnavailableError";
  }
}

function stripJsonCodeFence(text: string) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function isObjectIdentificationResult(
  value: unknown,
): value is ObjectIdentificationResult {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  const stringFields = [
    "englishName",
    "chineseName",
    "englishExample",
    "chineseExample",
  ];

  return (
    stringFields.every(
      (field) =>
        typeof candidate[field] === "string" &&
        (candidate[field] as string).trim().length > 0,
    ) &&
    ["noun", "verb", "adjective", "phrase", "other"].includes(
      String(candidate.partOfSpeech),
    ) &&
    ["high", "medium", "low"].includes(String(candidate.confidence))
  );
}

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== "object") return null;

  const candidate = error as { status?: unknown; statusCode?: unknown };
  const status = candidate.status ?? candidate.statusCode;
  return typeof status === "number" ? status : null;
}

function isRateLimitError(error: unknown) {
  if (getErrorStatus(error) === 429) return true;
  return (
    error instanceof Error &&
    /quota|rate.?limit|too many requests/i.test(error.message)
  );
}

/**
 * The same photograph answered for two different learners is two different
 * answers, so the pair is part of the key.
 *
 * Keyed on the image alone, whoever photographed a cup first would decide
 * what everyone else's card said, in their languages rather than the
 * photographer's.
 */
function cacheKey(
  imageBase64: string,
  [learning, native]: readonly [LanguageCode, LanguageCode],
) {
  return createHash("sha256")
    .update(`${learning}+${native}:`)
    .update(imageBase64)
    .digest("base64url");
}

function getCachedResult(key: string) {
  const cached = resultCache.get(key);
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    resultCache.delete(key);
    return null;
  }

  resultCache.delete(key);
  resultCache.set(key, cached);
  return cached.result;
}

function cacheResult(key: string, result: ObjectIdentificationResult) {
  resultCache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    result,
  });

  while (resultCache.size > CACHE_MAX_ITEMS) {
    const oldestKey = resultCache.keys().next().value;
    if (typeof oldestKey !== "string") break;
    resultCache.delete(oldestKey);
  }
}

export function getCachedObjectIdentification(
  imageBase64: string,
  languagePair: readonly [LanguageCode, LanguageCode],
) {
  return getCachedResult(cacheKey(imageBase64, languagePair));
}

async function identifyWithModel(
  client: GoogleGenAI,
  model: string,
  imageBase64: string,
  mediaType: string,
  languagePair: readonly [LanguageCode, LanguageCode],
) {
  const interaction = await client.interactions.create(
    {
      model,
      input: [
        {
          type: "text",
          text: buildIdentifyObjectPrompt(languagePair),
        },
        {
          type: "image",
          data: imageBase64,
          mime_type: mediaType,
          resolution: "high",
        },
      ],
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: OBJECT_RESULT_SCHEMA,
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
  if (!isObjectIdentificationResult(result)) {
    throw new Error("Gemini returned an invalid object result.");
  }

  return result;
}

async function identifyWithFallback(
  imageBase64: string,
  mediaType: string,
  languagePair: readonly [LanguageCode, LanguageCode],
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ObjectIdentificationUnavailableError();

  const client = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: REQUEST_TIMEOUT_MS,
      retryOptions: { attempts: 1 },
    },
  });

  let lowConfidenceResult: ObjectIdentificationResult | null = null;

  for (const model of getVisionModelCandidates()) {
    const cooldownUntil = modelCooldowns.get(model) ?? 0;
    if (cooldownUntil > Date.now()) continue;

    try {
      const result = await identifyWithModel(
        client,
        model,
        imageBase64,
        mediaType,
        languagePair,
      );

      if (result.confidence !== "low") return result;

      // Escalate only ambiguous photos to the stronger model. Clear photos
      // stay on Flash-Lite for lower latency and much lower quota use.
      lowConfidenceResult = result;
    } catch (error) {
      const status = getErrorStatus(error);

      if (isRateLimitError(error)) {
        modelCooldowns.set(model, Date.now() + MODEL_COOLDOWN_MS);
      }

      console.warn("Vision model unavailable; trying fallback.", {
        model,
        status,
        reason: isRateLimitError(error) ? "rate_limit" : "model_error",
      });
    }
  }

  if (lowConfidenceResult) return lowConfidenceResult;
  throw new ObjectIdentificationUnavailableError();
}

export async function identifyObject(
  imageBase64: string,
  mediaType: string,
  languagePair: readonly [LanguageCode, LanguageCode],
) {
  const key = cacheKey(imageBase64, languagePair);
  const cached = getCachedResult(key);
  if (cached) return cached;

  const existingRequest = inFlightIdentifications.get(key);
  if (existingRequest) return existingRequest;

  const request = identifyWithFallback(imageBase64, mediaType, languagePair)
    .then((result) => {
      cacheResult(key, result);
      return result;
    })
    .finally(() => {
      inFlightIdentifications.delete(key);
    });

  inFlightIdentifications.set(key, request);
  return request;
}
