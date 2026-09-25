import { after } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";

/* =========================================================
   Why a model call failed, kept somewhere that keeps it

   ── Why this exists ────────────────────────────────────────────────────

   Every Gemini failure in this app has been diagnosed the same way: someone
   sees "no meaning yet", and by the time anybody reads the Vercel logs they
   are gone. The Hobby plan keeps runtime logs for one hour. A reader in
   Taiwan looking a word up at eleven at night is, for a developer in New
   York, a failure that has already been deleted by the time they wake up.

   So a failure is written to `ai_call_log` in Supabase: which feature, which
   model, what kind of failure, the HTTP status, how long it took, and — for
   a quota refusal — the name of the quota, which is the part that says
   whether it was a per-minute burst or a day that is over.

   ── What it will not do ────────────────────────────────────────────────

   It never stores the prompt, the reader's text or their id. A failure is
   about the model, not the person, and the detail is cut short because a
   rejected request can come back with the prompt attached.

   It never makes the reader wait. The insert runs in `after()`, once the
   response has gone, and anything that goes wrong writing it is dropped:
   a log that cannot be written is not a lookup that failed.
   ========================================================= */

export type AiFailureReason =
  | "rate_limit"
  | "timeout"
  | "model_error"
  /** Every candidate failed and the reader was served the offline card. */
  | "served_offline";

export type AiFailure = {
  /** Which feature asked: "word-lookup", "identify-object", … */
  purpose: string;
  model: string;
  reason: AiFailureReason;
  status: number | null;
  ms: number;
  detail?: string | null;
};

const DETAIL_LIMIT = 400;

/** "Quota exceeded for metric: generativelanguage…/generate_content_free_tier_requests" */
export function readQuotaMetric(detail: string | null | undefined) {
  if (!detail) return null;

  const metric = /metric:\s*([\w./-]+)/i.exec(detail)?.[1] ?? null;
  const limit = /limit:\s*(\d+)/i.exec(detail)?.[1] ?? null;
  const quotaId = /quotaId["':\s]+([\w-]+)/i.exec(detail)?.[1] ?? null;

  if (!metric && !quotaId) return null;

  return [metric, quotaId, limit ? `limit ${limit}` : null]
    .filter(Boolean)
    .join(" · ");
}

async function insert(failure: AiFailure) {
  if (process.env.NODE_ENV === "test") return;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  try {
    const supabase = createServiceClient();

    await supabase.from("ai_call_log").insert({
      purpose: failure.purpose.slice(0, 60),
      model: failure.model.slice(0, 80),
      reason: failure.reason,
      status: failure.status,
      ms: Math.max(0, Math.round(failure.ms)),
      quota_metric: readQuotaMetric(failure.detail),
      detail: failure.detail ? failure.detail.slice(0, DETAIL_LIMIT) : null,
    });
  } catch {
    /* Dropped on purpose. See above. */
  }
}

/**
 * Record a failed model call without delaying the response.
 *
 * `after` needs a request to belong to. Every caller in this app is a route
 * handler, but a unit test or a script calling the same helper is not, and
 * `after` throws there — so outside a request the insert just runs detached.
 */
export function recordAiFailure(failure: AiFailure) {
  try {
    after(() => insert(failure));
  } catch {
    void insert(failure);
  }
}
