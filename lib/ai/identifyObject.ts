import { buildIdentifyObjectPrompt } from "@/lib/ai/prompts/identifyObject";
import { isLanguageCode, type LanguageCode } from "@/lib/languages";
import { createHash } from "node:crypto";

import { GoogleGenAI } from "@google/genai";
import {
  getVisionModelCandidates,
  readBoundedInteger,
} from "@/lib/ai/modelConfig";

export type ObjectIdentificationResult = {
  term: string;
  translation: string;
  partOfSpeech: "noun" | "verb" | "adjective" | "phrase" | "other";
  termExample: string;
  translationExample: string;
  confidence: "high" | "medium" | "low";
  /**
   * Which language each side is in.
   *
   * These fields were called englishName and chineseName until the app
   * taught five languages, at which point the names described two languages
   * the reader might not have either of. `term` is the headword in whichever
   * language the prompt asked for; these say which that was, so a word saved
   * from a photo carries its language rather than having one inferred from
   * its spelling weeks later.
   */
  termLanguage?: LanguageCode;
  translationLanguage?: LanguageCode;
};

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_MAX_ITEMS = 200;
const MODEL_COOLDOWN_MS = 65 * 1000;
/* =========================================================
   How long a recognition is given, and by whom

   These three numbers used to be one, and the one was eight seconds per
   model attempt with two models to try. Read together with the browser's
   own sixteen-second abort, that arithmetic never worked: a first attempt
   that timed out left exactly zero seconds for the second, so the fallback
   model could not once have delivered an answer to a reader. All it could
   do was hold the request open until the browser gave up — after the daily
   allowance had already been charged for it.

   A low-confidence first answer had the same shape. It is kept and the
   stronger model is tried, and at six seconds plus eight that reader was
   also going to see a timeout rather than the usable answer already in hand.

   So there is now a budget for the whole route, and each attempt takes the
   smaller of its own timeout and what is left of it. An attempt is not
   started at all if what remains would not be enough to finish one — better
   to return the imperfect answer we have than to spend the rest of the
   budget failing to improve it.
   ========================================================= */

/**
 * How finely the model samples the photo it is sent.
 *
 * "low" matches the single 768px tile the client sizes for; see the note at
 * the image part below. Raise it with VISION_RESOLUTION if a real photo is
 * identified worse than it used to be.
 */
const VISION_RESOLUTION = (process.env.VISION_RESOLUTION?.trim() ||
  "low") as "low" | "medium" | "high" | "ultra_high";

/** What one model attempt may take. Measured p50 is three to seven seconds. */
const REQUEST_TIMEOUT_MS = readBoundedInteger(
  process.env.VISION_REQUEST_TIMEOUT_MS,
  12_000,
  3_000,
  30_000,
);

/** What the whole route may take, fallbacks included. */
const TOTAL_BUDGET_MS = readBoundedInteger(
  process.env.VISION_TOTAL_BUDGET_MS,
  20_000,
  5_000,
  45_000,
);

/**
 * Below this, a further attempt is not worth starting.
 *
 * Nothing has ever come back from this model in under three seconds, so an
 * attempt given less than four is a way of spending the remaining budget on
 * a certain timeout.
 */
const MIN_ATTEMPT_MS = 4_000;

/*
 * Built per request: two of its fields are the pair, constrained to the two
 * codes the prompt named so the model chooses between them rather than
 * inventing a spelling of "French".
 */
function buildObjectResultSchema(
  [first, second]: readonly [LanguageCode, LanguageCode],
) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      term: { type: "string", minLength: 1, maxLength: 80 },
      translation: { type: "string", minLength: 1, maxLength: 80 },
      termLanguage: { type: "string", enum: [first, second] },
      translationLanguage: { type: "string", enum: [first, second] },
      partOfSpeech: {
        type: "string",
        enum: ["noun", "verb", "adjective", "phrase", "other"],
      },
      termExample: { type: "string", minLength: 4, maxLength: 160 },
      translationExample: { type: "string", minLength: 2, maxLength: 160 },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
    },
    required: [
      "term",
      "translation",
      "termLanguage",
      "translationLanguage",
      "partOfSpeech",
      "termExample",
      "translationExample",
      "confidence",
    ],
  };
}

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
    "term",
    "translation",
    "termExample",
    "translationExample",
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
    ["high", "medium", "low"].includes(String(candidate.confidence)) &&
    /*
     * Optional, so a result cached before the schema carried them still
     * passes — but a present-and-malformed value does not, because filing a
     * word under a language that does not exist is worse than filing it
     * under none.
     */
    isOptionalLanguage(candidate.termLanguage) &&
    isOptionalLanguage(candidate.translationLanguage)
  );
}

function isOptionalLanguage(value: unknown): boolean {
  return value === undefined || value === null || isLanguageCode(value);
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
  timeoutMs: number,
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
          /*
           * What kind of image this is.
           *
           * This was missing, and `mediaType` was threaded the whole way
           * down to this function as a parameter that nothing read. The API
           * answered 400 to every recognition — a base64 blob with no
           * declared type is not a request it can act on — and nobody saw
           * it, because the model in front of it was spending the entire
           * budget timing out before the API could object. Fixing the model
           * is what made this visible.
           *
           * lib/ai/menuScan.ts, which is the same call with a different
           * prompt, has always sent it.
           */
          mime_type: mediaType,
          /*
           * Sampled at the size it was actually sent at.
           *
           * The client resizes this photo to RECOGNITION_EDGE.object, which
           * is 768 because "Gemini bills images as 768x768 tiles, so 768 is
           * one tile and 1280 is four" — the frame is deliberately cut to a
           * single tile. Asking for "high" then sampled that one tile as
           * though there were four tiles of detail in it: more tokens and
           * more time for an image that does not contain the detail being
           * paid for, on the route whose whole problem is that it runs out
           * of budget.
           *
           * Overridable, because this is the one change here that could cost
           * recognition quality rather than only time.
           */
          resolution: VISION_RESOLUTION,
        },
      ],
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: buildObjectResultSchema(languagePair),
      },
      generation_config: {
        thinking_level: "low",
      },
      store: false,
    },
    {
      maxRetries: 0,
      timeout: timeoutMs,
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

  /*
   * No httpOptions here on purpose.
   *
   * This used to carry `timeout` and `retryOptions: { attempts: 1 }`, which
   * reads like a guard and is not one: measured on 2026-09-18, a client
   * configured exactly that way still spent 31.9 seconds retrying a refusal
   * on the interactions API, because that path ignores both. The per-call
   * options in identifyWithModel are what actually bound an attempt — see
   * lib/ai/modelRequest.ts.
   */
  const client = new GoogleGenAI({ apiKey });

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let lowConfidenceResult: ObjectIdentificationResult | null = null;

  for (const model of getVisionModelCandidates()) {
    const cooldownUntil = modelCooldowns.get(model) ?? 0;
    if (cooldownUntil > Date.now()) continue;

    /*
     * The budget decides whether there is a next attempt at all. Without
     * this the second model ran on borrowed time the browser had already
     * stopped waiting for.
     */
    const remaining = deadline - Date.now();
    if (remaining < MIN_ATTEMPT_MS) break;

    try {
      const result = await identifyWithModel(
        client,
        model,
        imageBase64,
        mediaType,
        languagePair,
        Math.min(REQUEST_TIMEOUT_MS, remaining),
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

      /*
       * The message, not only the status.
       *
       * A 400 here meant "this request is malformed" and the log said only
       * `status: 400`, which is the same line a quota problem or a bad model
       * name would print. The API says which field it objected to; there is
       * no reason to make the next person guess from a number. Truncated
       * because a rejected request can come back with the prompt attached.
       */
      console.warn("Vision model unavailable; trying fallback.", {
        model,
        status,
        reason: isRateLimitError(error) ? "rate_limit" : "model_error",
        detail:
          error instanceof Error ? error.message.slice(0, 300) : String(error),
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
