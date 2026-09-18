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
   `retryOptions: { attempts: 1 }` — is **not** honoured on the
   `interactions.create` path. Measured the same day, a client configured
   that way still took 31.9 seconds. Only the per-call second argument works,
   which is what this module hands out. Do not replace it with client config.
   ========================================================= */

/** What one text attempt may take before it is abandoned. */
export const TEXT_REQUEST_TIMEOUT_MS = readBoundedInteger(
  process.env.GEMINI_REQUEST_TIMEOUT_MS,
  15_000,
  3_000,
  45_000,
);

/**
 * The options every `interactions.create` in this app must be given.
 *
 * `maxRetries: 0` because the caller's candidate list already is the retry,
 * and `timeout` because a request with no ceiling is one the reader's own
 * patience ends instead.
 */
export function modelRequestOptions(timeoutMs: number = TEXT_REQUEST_TIMEOUT_MS) {
  return { maxRetries: 0, timeout: Math.max(1_000, Math.round(timeoutMs)) };
}

export function getErrorStatus(error: unknown) {
  if (!error || typeof error !== "object") return null;

  const candidate = error as { status?: unknown; statusCode?: unknown };
  const status = candidate.status ?? candidate.statusCode;
  return typeof status === "number" ? status : null;
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
 */
export async function withModelCandidates<T>(
  candidates: string[],
  attempt: (
    model: string,
    options: ReturnType<typeof modelRequestOptions>,
  ) => Promise<T>,
  timeoutMs: number = TEXT_REQUEST_TIMEOUT_MS,
): Promise<T> {
  let lastError: unknown = new Error("No model candidates are configured.");
  let triedAny = false;

  for (const model of candidates) {
    if (isModelCoolingDown(model)) continue;

    triedAny = true;

    try {
      return await attempt(model, modelRequestOptions(timeoutMs));
    } catch (error) {
      lastError = error;
      if (isRateLimitError(error)) startModelCooldown(model);
    }
  }

  /*
   * Every candidate was cooling down, so nothing was actually asked. Clearing
   * them and trying once is better than reporting a failure the reader cannot
   * act on — the cooldown is an optimisation, not a gate.
   */
  if (!triedAny && candidates.length > 0) {
    cooldowns.clear();
    return attempt(candidates[0], modelRequestOptions(timeoutMs));
  }

  throw lastError;
}
