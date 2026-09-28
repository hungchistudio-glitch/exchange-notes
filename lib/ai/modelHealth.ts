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

   - A 503 "high demand" (or a 500/502): forty-five seconds, as "busy".
     Added 2026-09-28, when every model answered 503 for hours and every
     feature asked every model on every request — a storm of refusals that
     made each lookup take 20–30 seconds to fail. Marked, the next request
     skips a model that just said it is full and goes to a fallback at once.

   ── When everything is marked ──────────────────────────────────────────

   It used to hand the whole list back, on the principle that a fast
   refusal beats not asking. With six models that became six refusals per
   request, on every request. Now: one model — the one whose mark ends
   soonest — is asked; and if every model is out for the day, none is, and
   the caller goes straight to its fallback.

   Reading it never makes a lookup wait long. The table is cached for a few
   seconds per instance; a read that takes longer than 1.5s keeps the last
   view this instance had (or none, on a cold start). Writing only ever
   lengthens a mark, so a model out for the day stays out for the day
   whatever a later, shorter refusal says.
   ========================================================= */

export type HealthReason = "timeout" | "rate_limit" | "daily_quota" | "busy";

const TABLE = "ai_model_health";
const TIMEOUT_AWAY_MS = 5 * 60 * 1000;
const BUSY_AWAY_MS = 45 * 1000;
const READ_CACHE_MS = 15_000;
/*
 * 600ms until 2026-09-28, when a cold instance whose first read took longer
 * treated the table as empty, asked gemini-3.6-flash — out for the day —
 * and its refusal, written back as a short "busy", erased the day-long mark
 * for everyone. A lookup can afford a second and a half here far better than
 * the whole app can afford forgetting which models are out.
 */
const READ_TIMEOUT_MS = 1_500;
/* After a failed read, how soon to try again (the last good view is kept). */
const READ_RETRY_MS = 3_000;

type Away = { until: number; reason: HealthReason };

let cached: { at: number; away: Map<string, Away> } | null = null;

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
  failure: {
    rateLimited: boolean;
    timedOut: boolean;
    message: string;
    /** The HTTP status, when there was one: 503 means "full right now". */
    status?: number | null;
  },
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

  if (failure.status === 503 || failure.status === 500 || failure.status === 502) {
    return { until: now + BUSY_AWAY_MS, reason: "busy" };
  }

  return null;
}

/** Every current mark, or null when the table could not be read in time. */
async function readAll(): Promise<Map<string, Away> | null> {
  const away = new Map<string, Away>();
  if (!enabled()) return away;

  try {
    const supabase = createServiceClient();
    const query = supabase
      .from(TABLE)
      .select("model, unavailable_until, reason")
      .gt("unavailable_until", new Date().toISOString());

    const result = await Promise.race([
      query,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), READ_TIMEOUT_MS)),
    ]);

    if (!result || result.error || !result.data) return null;

    for (const row of result.data as Array<{
      model: string;
      unavailable_until: string;
      reason: HealthReason;
    }>) {
      away.set(row.model, {
        until: Date.parse(row.unavailable_until),
        reason: row.reason,
      });
    }
  } catch {
    return null;
  }

  return away;
}

async function current(): Promise<Map<string, Away>> {
  if (cached && Date.now() - cached.at < READ_CACHE_MS) return cached.away;

  const away = await readAll();

  if (!away) {
    /*
     * The table did not answer in time. Keep the last view this instance
     * had, if any, and ask again shortly; with none, nothing marked is the
     * only view there is — but markModelAway no longer lets what that leads
     * to shorten anybody's mark.
     */
    const kept = cached?.away ?? new Map<string, Away>();
    cached = { at: Date.now() - READ_CACHE_MS + READ_RETRY_MS, away: kept };
    return kept;
  }

  cached = { at: Date.now(), away };
  return away;
}

/**
 * The candidates in order, minus any model another instance (or this one)
 * has put away.
 *
 * When every one is away: the single model whose mark ends soonest, so a
 * core request still gets one real try; or none at all when every model
 * is out for the day, so the caller goes straight to its fallback.
 */
export async function healthyModels(
  candidates: readonly string[],
): Promise<string[]> {
  const away = await current();
  const now = Date.now();
  const healthy = candidates.filter(
    (model) => (away.get(model)?.until ?? 0) <= now,
  );
  if (healthy.length > 0) return healthy;

  const retryable = candidates
    .map((model) => ({ model, entry: away.get(model) }))
    .filter(({ entry }) => entry?.reason !== "daily_quota")
    .sort((a, b) => (a.entry?.until ?? 0) - (b.entry?.until ?? 0));

  return retryable.length > 0 ? [retryable[0].model] : [];
}

/*
 * "額度充足" — enough to spare for work nobody is waiting on.
 *
 * Chi's rule (2026-09-28): automatic IPA, and anything else that runs in
 * the background, only when the allowance is comfortable, so it never
 * takes a model away from the camera or a lookup. The allowance itself is
 * not reported by the API, so this reads what is: at least two models not
 * out, not busy, not hanging, right now.
 */
export const BACKGROUND_MIN_HEALTHY = 2;

export async function backgroundAllowed(
  candidates: readonly string[],
): Promise<boolean> {
  const away = await current();
  const now = Date.now();
  const healthy = candidates.filter(
    (model) => (away.get(model)?.until ?? 0) <= now,
  );
  return healthy.length >= BACKGROUND_MIN_HEALTHY;
}

/**
 * When the day's quota comes back — but only if it is the whole story.
 *
 * Every candidate has to be away for its daily quota; one model out for a
 * five-minute hang, or not away at all, means the next lookup may well be
 * answered, and telling the reader "come back at 3pm" would be wrong. When
 * it is the whole story, the soonest reset is the honest time to give.
 */
export async function dailyQuotaResetAt(
  candidates: readonly string[],
): Promise<number | null> {
  if (candidates.length === 0) return null;

  const away = await current();
  const now = Date.now();
  let soonest: number | null = null;

  for (const model of candidates) {
    const entry = away.get(model);
    if (!entry || entry.reason !== "daily_quota" || entry.until <= now) {
      return null;
    }
    soonest = soonest === null ? entry.until : Math.min(soonest, entry.until);
  }

  return soonest;
}

/*
 * "Google 掛掉" — said plainly, and said at once (Chi, 2026-09-28).
 *
 * When every model a feature could ask is away, the honest answer is that
 * Google's AI is unavailable right now, with when it is likely back — not a
 * spinner that waits out every model before saying "busy". Callers ask this
 * before spending anything, and tell the reader instead of asking.
 *
 * `quotaOnly` when every one is out for the day, so the reader can be told
 * the day's free allowance is spent (and when it resets) rather than that
 * Google is having a bad minute.
 */
export type ModelOutage = { until: number; quotaOnly: boolean };

export async function allModelsAway(
  candidates: readonly string[],
  extraMarks: readonly string[] = [],
): Promise<ModelOutage | null> {
  if (candidates.length === 0) return null;

  const away = await current();
  const now = Date.now();

  /* A sentinel mark (e.g. the camera's own outage) covers the whole list. */
  for (const mark of extraMarks) {
    const entry = away.get(mark);
    if (entry && entry.until > now) {
      return { until: entry.until, quotaOnly: false };
    }
  }

  let soonest = Infinity;
  let quotaOnly = true;

  for (const model of candidates) {
    const entry = away.get(model);
    if (!entry || entry.until <= now) return null;
    soonest = Math.min(soonest, entry.until);
    if (entry.reason !== "daily_quota") quotaOnly = false;
  }

  return { until: soonest, quotaOnly };
}

/** Put a model away, for this instance at once and for every other soon. */
export async function markModelAway(
  model: string,
  verdict: { until: number; reason: HealthReason },
): Promise<void> {
  if (cached) {
    const previous = cached.away.get(model);
    if (!previous || previous.until < verdict.until) {
      cached.away.set(model, { until: verdict.until, reason: verdict.reason });
    }
  }
  if (!enabled()) return;

  try {
    const supabase = createServiceClient();

    /*
     * Only ever lengthens a mark (migration 20260928212149_mark_model_away).
     *
     * This was a plain upsert, so the last writer won: a model out for the
     * day until midnight Pacific, asked by an instance that had not read the
     * table in time, answered 503 — and "busy for 45 seconds" replaced "out
     * until tomorrow". Forty-five seconds later every feature asked it again
     * (2026-09-28, gemini-3.6-flash, 21:00–21:18 UTC).
     */
    const { error } = await supabase.rpc("mark_model_away", {
      p_model: model,
      p_until: new Date(verdict.until).toISOString(),
      p_reason: verdict.reason,
    });

    if (error) {
      await supabase.from(TABLE).upsert(
        {
          model,
          unavailable_until: new Date(verdict.until).toISOString(),
          reason: verdict.reason,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "model" },
      );
    }
  } catch {
    /* The local mark still holds for this instance. */
  }
}

export function resetModelHealthForTests() {
  cached = null;
}
