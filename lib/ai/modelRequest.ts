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
       * Both, deliberately. The transport timeout is what the SDK offers and
       * the abort is what the platform guarantees — and the whole reason
       * this module exists is that a request which ignored its ceiling was
       * indistinguishable from a model thinking hard.
       */
      abortSignal: AbortSignal.timeout(timeout),
      httpOptions: { timeout, retryOptions: { attempts: 1 } },
      responseMimeType: "application/json",
      ...(schema ? { responseSchema: schema as never } : {}),
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
  return (
    error instanceof Error &&
    /timed out|timeout|aborted due to timeout/i.test(error.message)
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
