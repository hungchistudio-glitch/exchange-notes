import type { GoogleGenAI, Part } from "@google/genai";

import { readBoundedInteger } from "@/lib/ai/modelConfig";

/* =========================================================
   How a model call is allowed to fail

   Every route in this app that reaches Gemini tries a list of candidate
   models in order, so that a busy one does not cost the reader the request.
   That design only works if a failure is quick. It was not.

   Measured against the project's own key on 2026-09-18, one exhausted model
   took **34.8 seconds** to report that it was exhausted:

     gemini-3.5-flash, SDK defaults      RateLimitError after 34768ms
     gemini-3.5-flash, maxRetries: 0     RateLimitError after   225ms

   The SDK retries a 429 five times with backoff before surfacing it, and a
   free-tier daily cap does not clear during those five attempts — the answer
   is known at the first one. Nine of this app's twelve model calls passed no
   per-call options at all, so every one of them could spend half a minute
   learning something it was told immediately.

   The candidate list is the retry policy here. The SDK's own retry is a
   second, invisible one underneath it, and the two multiply: two candidates
   at five attempts each is ten requests and a minute of waiting for a reader
   who is looking at a spinner.

   A trap worth knowing: `httpOptions` on the client — `timeout`,
   `retryOptions: { attempts: 1 }` — was **not** honoured on the
   `interactions.create` path this app used to call. Measured the same day, a
   client configured that way still took 31.9 seconds.

   That path is gone; see generateJson below.
   ========================================================= */

/** What one text attempt may take before it is abandoned. */
export const TEXT_REQUEST_TIMEOUT_MS = readBoundedInteger(
  process.env.GEMINI_REQUEST_TIMEOUT_MS,
  15_000,
  3_000,
  45_000,
);

/*
 * The shortest deadline this endpoint will accept.
 *
 * `httpOptions.timeout` is not a local stopwatch — the SDK sends it on to
 * Gemini as the request's deadline, and Gemini refuses one it considers too
 * short. Measured on production 2026-09-23, /api/classify-text, second
 * candidate:
 *
 *   gemini-3.6-flash   400 after 124ms
 *   {"error":{"code":400,"message":"Manually set deadline 7s is too short.
 *    Minimum allowed deadline is 10s.","status":"INVALID_ARGUMENT"}}
 *
 * That is the whole outage in one line. A candidate list hands each attempt
 * whatever is left of the total budget, so the *second* candidate is almost
 * always under ten seconds — which means the fallback model in this app was
 * never once asked a question it was allowed to answer. The same model
 * replied `{"ok": true}` in 893ms when the diagnostics route asked it with a
 * legal deadline, a minute earlier.
 *
 * So the deadline sent to Gemini has a floor, and the real ceiling stays
 * local: `abortSignal` still fires at the caller's budget. A model that
 * answers in under a second answers well inside six, and an attempt that
 * runs long is still cut off exactly when the route says so.
 */
export const MIN_MODEL_DEADLINE_MS = 10_000;

/* =========================================================
   One way to ask a model something

   ── Why this exists ────────────────────────────────────────────────────

   Twelve places in this app called Gemini, each writing out the same request
   by hand: the same response_format, the same generation_config, the same
   `store: false`, the same "throw if the output is empty". Twelve copies of
   one call is how the model names drifted apart, and it is how the missing
   `mime_type` on the camera's image part survived for weeks in a file whose
   neighbour had always sent it.

   ── Why it is generateContent and not interactions.create ──────────────

   All twelve called `client.interactions.create`, which posts to
   `/v1beta/interactions`. Between 18 and 23 September every one of those
   calls stopped coming back: not refused, not rate-limited — no reply at
   all, across four different model names, on every route that reaches
   Gemini. Production logs for /api/identify-object on the 23rd show both
   vision candidates timing out one after the other, twelve seconds and
   eight, and the route answering 503 with nothing to report but two
   TimeoutErrors.

   `models.generateContent` is the endpoint the Gemini API is documented
   around and the one the SDK's own examples use. Moving to it is not a
   guess at the cause; it is removing the one thing this app was doing
   differently from everybody else, so that the next failure is legible.

   Two differences worth writing down:

   - Per-call options are gone. A ceiling now comes from `config.abortSignal`
     and `config.httpOptions`, both of which this helper always sets — an
     abort is a guarantee the transport cannot ignore, which is exactly what
     the old path did ignore.
   - `resolution` on an image part has no equivalent here. It does not need
     one: the client already resizes a photo to 768px, which is a single
     billing tile, so the sampling the old option asked for is the sampling
     the image can support.
   ========================================================= */

/* =========================================================
   The schema, in the dialect this endpoint speaks

   ── What went wrong ────────────────────────────────────────────────────

   Every schema in this app is written as ordinary JSON Schema, because the
   endpoint it used to be sent to accepted ordinary JSON Schema. Gemini's
   `responseSchema` is a narrower thing — the OpenAPI subset — and it rejects
   what it does not recognise rather than ignoring it.

   Two differences, and all twelve of the app's schemas have both:

   - `additionalProperties` does not exist here. All twelve set it to false.
   - `minLength`, `maxLength`, `minItems` and `maxItems` are **strings** in
     this dialect, and all twelve pass numbers.

   Measured on production the day the endpoint changed: gemini-3.6-flash
   answered `400` in 109 milliseconds — far too fast to have read a word of
   the prompt, which is what a rejected request looks like. Every route that
   reaches Gemini was failing that way at once, which is exactly what the
   reader met: no lookups, no recognition, no translation.

   ── Why it is fixed here and not in twelve schemas ─────────────────────

   Because there are twelve of them. A rule enforced in one place is a rule;
   twelve copies of it are a thing that drifts, which is the lesson this file
   already exists to hold. The schemas stay readable as what they are, and
   this translates them on the way out.
   ========================================================= */

const SCHEMA_KEYS = new Set([
  "anyOf", "default", "description", "enum", "example", "format", "items",
  "maxItems", "maxLength", "maxProperties", "maximum", "minItems", "minLength",
  "minProperties", "minimum", "nullable", "pattern", "properties",
  "propertyOrdering", "required", "title", "type",
]);

/** The bounds this dialect spells as strings rather than numbers. */
const STRING_BOUNDS = new Set([
  "maxItems", "maxLength", "maxProperties",
  "minItems", "minLength", "minProperties",
]);

function toGeminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);
  if (!schema || typeof schema !== "object") return schema;

  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    /*
     * Dropped rather than reported. A keyword this endpoint has no opinion
     * about — `additionalProperties`, say — is a constraint the prompt
     * beside it still states in words, and failing the whole request over
     * one is how every route in the app went dark at once.
     */
    if (!SCHEMA_KEYS.has(key)) continue;

    if (STRING_BOUNDS.has(key) && typeof value === "number") {
      out[key] = String(value);
      continue;
    }

    if (key === "type" && typeof value === "string") {
      out[key] = value.toUpperCase();
      continue;
    }

    if (key === "properties" && value && typeof value === "object") {
      out[key] = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([name, child]) => [
          name,
          toGeminiSchema(child),
        ]),
      );
      continue;
    }

    out[key] =
      key === "items" || key === "anyOf" ? toGeminiSchema(value) : value;
  }

  return out;
}

/**
 * One piece of what is being asked.
 *
 * Text, or something sent inline with it: a photograph for the recogniser, a
 * recording for the voice lookup. Both travel the same way, so they are one
 * shape here rather than two that would have to be kept in step.
 */
export type ModelInputPart =
  | { text: string }
  | { media: { data: string; mimeType: string } };

export type GenerateJsonOptions = {
  model: string;
  /** A prompt, or the parts of one. */
  input: string | ModelInputPart[];
  /** The shape the answer must take. */
  schema?: unknown;
  /** What this one attempt may take. The caller's candidate list is the retry. */
  timeoutMs?: number;
};

function toParts(input: string | ModelInputPart[]): Part[] {
  if (typeof input === "string") return [{ text: input }];

  return input.map((part) =>
    "text" in part
      ? { text: part.text }
      : {
          inlineData: { data: part.media.data, mimeType: part.media.mimeType },
        },
  );
}

/**
 * Asks one model for one JSON answer, and returns the text of it.
 *
 * Throws when the model answers with nothing, so a caller never has to tell
 * an empty string apart from a missing field several lines later.
 */
export async function generateJson(
  client: GoogleGenAI,
  { model, input, schema, timeoutMs = TEXT_REQUEST_TIMEOUT_MS }: GenerateJsonOptions,
): Promise<string> {
  const timeout = Math.max(1_000, Math.round(timeoutMs));

  const response = await client.models.generateContent({
    model,
    contents: [{ role: "user", parts: toParts(input) }],
    config: {
      /*
       * Both, deliberately, and they are not the same number. The abort is
       * this attempt's real ceiling — the one the route's budget decided and
       * the platform guarantees. The transport timeout is a deadline Gemini
       * reads and can reject, so it has a floor of its own.
       */
      abortSignal: AbortSignal.timeout(timeout),
      httpOptions: {
        /*
         * Never below the floor, because this number leaves the process:
         * see MIN_MODEL_DEADLINE_MS. The abort above is the ceiling that
         * actually binds this attempt.
         */
        timeout: Math.max(MIN_MODEL_DEADLINE_MS, timeout),
        retryOptions: { attempts: 1 },
      },
      responseMimeType: "application/json",
      ...(schema ? { responseSchema: toGeminiSchema(schema) as never } : {}),
      /*
       * Every one of these is an extraction or a translation with a schema
       * attached. None of them is improved by the model reasoning at length
       * first, and all of them are paid for in the reader's waiting.
       */
      thinkingConfig: { thinkingLevel: "LOW" as never },
    },
  });

  const outputText = typeof response.text === "string" ? response.text : "";

  if (!outputText.trim()) {
    throw new Error("Gemini returned an empty response.");
  }

  return outputText;
}

export function getErrorStatus(error: unknown) {
  if (!error || typeof error !== "object") return null;

  const candidate = error as { status?: unknown; statusCode?: unknown };
  const status = candidate.status ?? candidate.statusCode;
  return typeof status === "number" ? status : null;
}

/*
 * A model that spent the entire budget and told us nothing.
 *
 * Measured in production on 2026-09-22: `gemini-3.5-flash` returned at
 * 14003ms, 14007ms and 14003ms against a 14000ms ceiling — three for three,
 * to the millisecond. That is not a slow answer, it is no answer, and the
 * reader paid the whole ceiling for it before the next candidate was even
 * tried.
 *
 * Treated like a rate limit for cooldown purposes, because from this app's
 * side they are the same event: the model is not going to serve this request
 * shape right now, and asking it again in thirty seconds costs another full
 * ceiling. A rate limit is cheap to discover and a timeout is the most
 * expensive thing here — if anything this is the one that matters more.
 */
export function isTimeoutError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const named = (error as { name?: unknown }).name;
  if (named === "TimeoutError" || named === "AbortError") return true;

  /*
   * Gemini's own word for it, which does not contain the word "timeout".
   *
   * When the deadline we sent runs out at Gemini's end rather than ours, the
   * failure arrives as an ordinary API error and the client never aborts:
   *
   *   504 {"error":{"code":504,"message":"Deadline expired before operation
   *    could complete.","status":"DEADLINE_EXCEEDED"}}
   *
   * Measured on production 2026-09-23: gemini-3.5-flash-lite returned that
   * at 13478ms against a 14000ms budget, and because the text below did not
   * match it, the model was never put into cooldown — so the next lookup,
   * and the one after, each paid the same fourteen seconds to learn the same
   * thing. That is the difference between one slow lookup and a slow app.
   */
  if (getErrorStatus(error) === 504) return true;

  return (
    error instanceof Error &&
    /timed out|timeout|aborted due to timeout|deadline expired|DEADLINE_EXCEEDED/i.test(
      error.message,
    )
  );
}

/** Either reason to stop asking this model for a while. */
export function shouldCoolDown(error: unknown) {
  return isRateLimitError(error) || isTimeoutError(error);
}

export function isRateLimitError(error: unknown) {
  if (getErrorStatus(error) === 429) return true;
  return (
    error instanceof Error &&
    /quota|rate.?limit|too many requests/i.test(error.message)
  );
}

/*
 * Models known to be refusing, so the next request does not ask again.
 *
 * A minute is longer than a per-minute window and shorter than a daily one,
 * which is the useful compromise: a model that is briefly busy comes back on
 * its own, and one that is out for the day is asked twelve times an hour
 * rather than on every request.
 *
 * Module state, so it is per warm instance and empty on a cold start. That
 * is a real limit rather than a bug — at this app's traffic most requests
 * land cold and skip nothing — but a cooldown that helps only sometimes
 * still costs nothing, and the 225ms failure above is what makes a miss
 * survivable.
 */
const MODEL_COOLDOWN_MS = 65 * 1000;
const cooldowns = new Map<string, number>();

export function isModelCoolingDown(model: string) {
  const until = cooldowns.get(model) ?? 0;
  if (until > Date.now()) return true;
  if (until) cooldowns.delete(model);
  return false;
}

export function startModelCooldown(model: string) {
  cooldowns.set(model, Date.now() + MODEL_COOLDOWN_MS);
}

/**
 * Runs `attempt` against each candidate until one answers.
 *
 * Skips models that are still cooling down, puts a model that reports a rate
 * limit into cooldown, and rethrows the last error when every candidate is
 * spent — so the caller's own error handling, refunds included, is unchanged.
 *
 * The attempt is handed the model to ask and the time it has to do it in;
 * what it does with both is generateJson's business.
 */
export async function withModelCandidates<T>(
  candidates: string[],
  attempt: (model: string, timeoutMs: number) => Promise<T>,
  timeoutMs: number = TEXT_REQUEST_TIMEOUT_MS,
): Promise<T> {
  let lastError: unknown = new Error("No model candidates are configured.");
  let triedAny = false;

  for (const model of candidates) {
    if (isModelCoolingDown(model)) continue;

    triedAny = true;

    try {
      return await attempt(model, timeoutMs);
    } catch (error) {
      lastError = error;
      if (shouldCoolDown(error)) startModelCooldown(model);
    }
  }

  /*
   * Every candidate was cooling down, so nothing was actually asked. Clearing
   * them and trying once is better than reporting a failure the reader cannot
   * act on — the cooldown is an optimisation, not a gate.
   */
  if (!triedAny && candidates.length > 0) {
    cooldowns.clear();
    return attempt(candidates[0], timeoutMs);
  }

  throw lastError;
}
