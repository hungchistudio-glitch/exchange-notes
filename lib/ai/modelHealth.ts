import { createServiceClient } from "@/lib/supabase/service";

/* =========================================================
   Which models to leave alone — for every server at once

   ── Why this exists ────────────────────────────────────────────────────

   A model that hangs, or has spent the day's free-tier quota, used to be
   put away in a Map inside one serverless instance. Vercel starts new
   instances all the time, and every one of them learned the same thing the
   slow way. On 2026-09-27 a French lookup waited 13.5 seconds for
   gemini-3.6-flash to answer DEADLINE_EXCEEDED before trying the model that
   then answered in one — and the next cold instance would have done it
   again.

   So the verdict is written to `ai_model_health` and read by everyone.

   ── How long a model is put away ───────────────────────────────────────

   - A daily quota refusal (GenerateRequestsPerDay…): until the quota
     resets, which for the Gemini API is midnight Pacific time. Asking
     again before then is guaranteed to be refused.
   - Any other rate limit: as long as the refusal asked for, plus a second.
   - A timeout: five minutes. Long enough that a burst of lookups does not
     each pay for the hang, short enough that a model which recovers is
     back within one coffee.

   ── What it will not do ────────────────────────────────────────────────

   It never takes the last model away. If every candidate is marked, the
   caller gets the full list back: a refusal that comes back in 150ms is
   still better than not asking at all.

   Reading it never makes a lookup wait long. The table is cached for a few
   seconds per instance, and a read that takes longer than 600ms is treated
   as "nothing marked".
   ========================================================= */

export type HealthReason = "timeout" | "rate_limit" | "daily_quota";

const TABLE = "ai_model_health";
const TIMEOUT_AWAY_MS = 5 * 60 * 1000;
const READ_CACHE_MS = 15_000;
const READ_TIMEOUT_MS = 600;

let cached: { at: number; until: Map<string, number> } | null = null;

function enabled() {
  return (
    process.env.NODE_ENV !== "test" &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

/**
 * The next midnight in America/Los_Angeles, as epoch milliseconds — when the
 * Gemini API's per-day quotas reset.
 */
export function nextPacificMidnight(now = Date.now()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(now));

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  const hour = get("hour") % 24;
  const elapsedToday =
    ((hour * 60 + get("minute")) * 60 + get("second")) * 1000 +
    (now % 1000);

  return now - elapsedToday + 24 * 60 * 60 * 1000;
}

/**
 * How long to put a model away for this failure, or null for "don't".
 * `retryMs` is the wait the refusal itself asked for, when it asked.
 */
export function awayFor(
  failure: { rateLimited: boolean; timedOut: boolean; message: string },
  retryMs: number,
  now = Date.now(),
): { until: number; reason: HealthReason } | null {
  if (failure.rateLimited) {
    if (/PerDay/i.test(failure.message)) {
      return { until: nextPacificMidnight(now), reason: "daily_quota" };
    }
    return { until: now + retryMs, reason: "rate_limit" };
  }

  if (failure.timedOut) {
    return { until: now + TIMEOUT_AWAY_MS, reason: "timeout" };
  }

  return null;
}

async function readAll(): Promise<Map<string, number>> {
  const until = new Map<string, number>();
  if (!enabled()) return until;

  try {
    const supabase = createServiceClient();
    const query = supabase
      .from(TABLE)
      .select("model, unavailable_until")
      .gt("unavailable_until", new Date().toISOString());

    const result = await Promise.race([
      query,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), READ_TIMEOUT_MS)),
    ]);

    if (!result || result.error || !result.data) return until;

    for (const row of result.data as Array<{ model: string; unavailable_until: string }>) {
      until.set(row.model, Date.parse(row.unavailable_until));
    }
  } catch {
    /* Nothing marked is the safe way to be wrong here. */
  }

  return until;
}

async function current(): Promise<Map<string, number>> {
  if (cached && Date.now() - cached.at < READ_CACHE_MS) return cached.until;
  const until = await readAll();
  cached = { at: Date.now(), until };
  return until;
}

/**
 * The candidates in order, minus any model another instance (or this one)
 * has put away. Never empty: if everything is marked, everything is asked.
 */
export async function healthyModels(
  candidates: readonly string[],
): Promise<string[]> {
  const until = await current();
  const now = Date.now();
  const healthy = candidates.filter((model) => (until.get(model) ?? 0) <= now);
  return healthy.length > 0 ? healthy : [...candidates];
}

/** Put a model away, for this instance at once and for every other soon. */
export async function markModelAway(
  model: string,
  verdict: { until: number; reason: HealthReason },
): Promise<void> {
  if (cached) cached.until.set(model, Math.max(cached.until.get(model) ?? 0, verdict.until));
  if (!enabled()) return;

  try {
    const supabase = createServiceClient();
    await supabase.from(TABLE).upsert(
      {
        model,
        unavailable_until: new Date(verdict.until).toISOString(),
        reason: verdict.reason,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "model" },
    );
  } catch {
    /* The local mark still holds for this instance. */
  }
}

export function resetModelHealthForTests() {
  cached = null;
}
