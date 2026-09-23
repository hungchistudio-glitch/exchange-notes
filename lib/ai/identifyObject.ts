import { buildIdentifyObjectPrompt } from "@/lib/ai/prompts/identifyObject";
import { isLanguageCode, type LanguageCode } from "@/lib/languages";
import { createHash } from "node:crypto";

import { GoogleGenAI } from "@google/genai";

import {
  cooldownMsFor,
  generateJson,
  getErrorStatus,
  isRateLimitError,
  shouldCoolDown,
} from "@/lib/ai/modelRequest";
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
  const outputText = await generateJson(client, {
    model,
    input: [
      { text: buildIdentifyObjectPrompt(languagePair) },
      /*
       * The photo, and what kind of photo it is.
       *
       * The media type was once missing here while `mediaType` was threaded
       * the whole way down as a parameter nothing read; the API answered 400
       * to every recognition, invisibly, because the model in front of it
       * spent the entire budget timing out before the API could object. It
       * cannot go missing again: the part carries the two together or it
       * does not typecheck.
       *
       * There is no `resolution` any more. The old endpoint took one and
       * this one does not, which costs nothing: the client already resizes
       * this frame to RECOGNITION_EDGE.object — 768px, deliberately one
       * billing tile — so the detail the flag used to ask for is the detail
       * the image has.
       */
      { media: { data: imageBase64, mimeType: mediaType } },
    ],
    schema: buildObjectResultSchema(languagePair),
    timeoutMs: timeoutMs,
  });

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
   * reads like a guard and was not one: measured on 2026-09-18, a client
   * configured exactly that way still spent 31.9 seconds retrying a refusal,
   * because the endpoint this app then called ignored both. What bounds an
   * attempt is generateJson, per call — see lib/ai/modelRequest.ts.
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

      /*
       * A timeout puts the model away too, not only a rate limit.
       *
       * This line read `isRateLimitError` and the camera paid for it on
       * every photograph: the first candidate spent its whole twelve
       * seconds answering nothing, was never put away for it, and was asked
       * again on the next shot. The text route learned this on 2026-09-22
       * and this one did not hear about it.
       */
      if (shouldCoolDown(error)) {
        modelCooldowns.set(model, Date.now() + cooldownMsFor(error));
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
