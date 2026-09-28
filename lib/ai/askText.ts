import type { GoogleGenAI } from "@google/genai";

import { CORE_MAX_ATTEMPTS, firstAnswer } from "@/lib/ai/hedge";
import { getTextModelCandidates } from "@/lib/ai/modelConfig";
import {
  backgroundAllowed,
  dailyQuotaResetAt,
  healthyModels,
} from "@/lib/ai/modelHealth";
import {
  generateJson,
  TEXT_REQUEST_TIMEOUT_MS,
  type ModelInputPart,
} from "@/lib/ai/modelRequest";

/* =========================================================
   Asking for text the way the word lookup already does

   The word lookup learned three things between 22 and 27 September: lead
   with the model that answers (the lite alias), skip a model another
   instance has already seen hang or run out, and if the one in front is
   slow, ask the next alongside it rather than after it. It learned them in
   its own route, so nothing else did.

   Three other features kept asking gemini-3.6-flash alone — the one model
   in the table that hangs:

   - Yumi reading a friend's message spent the free tier's daily twenty on
     it and then asked eleven more times in four seconds (2026-09-25).
   - The daily news produced nothing on 23–26 September and two cards on
     the 27th: every batch was a 503, a 504 or a 429 from that one model.
   - Reply suggestions, the same way, whenever someone pressed the button.

   This is the lookup's policy with the lookup's particulars taken out, so
   those three can share it.
   ========================================================= */

export type AskTextOptions = {
  /** Which feature is asking, for ai_call_log. */
  purpose: string;
  input: string | ModelInputPart[];
  schema?: unknown;
  /** The whole thing, every candidate included. */
  budgetMs: number;
  /** Ask the next candidate as well when nothing has answered by now. */
  hedgeAfterMs?: number;
  /** No single attempt may take longer than this. */
  maxAttemptMs?: number;
  /** No attempt is started with less time left than this. */
  minAttemptMs?: number;
  /** Defaults to the text list in lib/ai/modelConfig.ts. */
  candidates?: readonly string[];
  /**
   * Nobody is waiting on this (the nightly news, a refill). It runs only
   * when the allowance is comfortable, asks one model, and never hedges —
   * so it cannot take a model away from the camera or a lookup.
   */
  background?: boolean;
};

export type AskTextResult =
  | { text: string; model: string }
  | {
      text: null;
      /**
       * When every candidate is out for the day, the soonest reset — so a
       * caller can stop asking until then instead of asking again.
       */
      quotaResetsAt: number | null;
    };

/** Default: long enough that most answers arrive before it, as in the lookup. */
export const ASK_TEXT_HEDGE_AFTER_MS = 4_000;
const ASK_TEXT_MIN_ATTEMPT_MS = 4_000;

/**
 * When the whole candidate list is out for the day — before spending
 * anything on finding that out again.
 */
export function textQuotaResetAt(
  candidates: readonly string[] = getTextModelCandidates(),
): Promise<number | null> {
  return dailyQuotaResetAt(candidates);
}

export async function askText(
  client: GoogleGenAI,
  {
    purpose,
    input,
    schema,
    budgetMs,
    hedgeAfterMs = ASK_TEXT_HEDGE_AFTER_MS,
    maxAttemptMs = TEXT_REQUEST_TIMEOUT_MS,
    minAttemptMs = ASK_TEXT_MIN_ATTEMPT_MS,
    candidates = getTextModelCandidates(),
    background = false,
  }: AskTextOptions,
): Promise<AskTextResult> {
  if (background && !(await backgroundAllowed(candidates))) {
    return { text: null, quotaResetsAt: await dailyQuotaResetAt(candidates) };
  }

  const deadline = Date.now() + budgetMs;
  const models = await healthyModels(candidates);

  /*
   * generateJson does the bookkeeping on every failed attempt — the shared
   * health row and the failure log — so nothing is recorded twice here.
   */
  const answered = await firstAnswer(
    models,
    (model, timeoutMs, signal) =>
      generateJson(client, { model, input, schema, timeoutMs, purpose, signal }),
    {
      hedgeAfterMs: background ? Number.POSITIVE_INFINITY : hedgeAfterMs,
      deadline,
      minAttemptMs,
      maxAttemptMs,
      maxAttempts: background ? 1 : CORE_MAX_ATTEMPTS,
    },
  );

  if (answered) return { text: answered.value, model: answered.model };

  return { text: null, quotaResetsAt: await dailyQuotaResetAt(candidates) };
}
