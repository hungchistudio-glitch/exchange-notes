import type { createClient } from "@/lib/supabase/server";

/* =========================================================
   One daily allowance, counted in one place

   Six routes send something to a model on the reader's behalf, and until now
   each carried its own copy of the counting: the same RPC call, the same
   "quota function is missing" latch, the same unwrapping of a one-row result.
   Four copies had drifted. Two fell back to an in-memory counter when the
   database function was unreachable; the other two returned `true`, which
   removes the limit entirely at the moment it is least safe to.

   The drift is why this module exists. Adding refunds meant touching all six,
   and six divergent copies each growing a refund path is how the next
   inconsistency gets written.

   Two rules, and the second is the one the reader feels:

   1. Spend before the model runs. Anything else lets two shutter presses
      race and both be allowed.
   2. Give it back when the model does not answer. A timeout charged like an
      answer is what turned fifteen lookups a day into eight or nine.
   ========================================================= */

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * The operations that draw on a daily allowance.
 *
 * A union rather than a bare string: the database checks this name against
 * `^[a-z0-9_-]{1,40}$` and a typo would otherwise open a fresh counter with
 * a full allowance rather than failing.
 */
export type AiOperation =
  | "vision_identification"
  | "menu_scan"
  | "note_translation"
  | "note_interpretation"
  | "message_decode"
  | "reply_coach"
  /*
   * The last two are the background ones, and they are counted differently
   * from the six above: those are a person pressing a button, one press one
   * unit. These fire on their own — a screen of word cards rendering, a
   * library filling itself in after a language change — so a unit is one
   * call that actually reaches the model, after the cache has answered
   * everything it can. Charging a request that a cache satisfies would spend
   * the reader's day on a screen that never asked the model anything.
   */
  /** /api/text-translate — a card rendered in a language it was not sent in. */
  | "card_translation"
  /** /api/vocabulary/translate — one batch of the library fill. */
  | "library_fill";

type Window = { count: number; resetsAt: number };

/**
 * The fallback counter, used only while the database function is unreachable.
 *
 * Keyed by operation as well as user and day, because one map now serves
 * every route. It is per-instance and therefore leaky by nature — a serverless
 * process that has just started has forgotten everything. That is acceptable
 * for a safety net and unacceptable as the primary counter, which is why the
 * database owns the real one.
 */
const memoryWindows = new Map<string, Window>();

/*
 * When to try the database counter again after it refused.
 *
 * This was a latch with no way out: the first RPC error moved an operation
 * onto the in-memory counter for the entire life of the serverless instance.
 * A single cold-start timeout, one dropped connection, one moment of
 * database pressure, and that instance never asked again — every reader it
 * went on to serve was counted by the map below, which the comment on it
 * calls "unacceptable as the primary counter" and which it had just become.
 *
 * It is worse than a wrong number. The fallback is per-instance, so the real
 * ceiling becomes the limit multiplied by however many instances are warm,
 * and it is forgotten on every cold start — so a reader who has spent their
 * fifteen lookups can get fifteen more by being routed elsewhere. The
 * database counter exists precisely because neither of those is acceptable.
 *
 * A minute is long enough that a database genuinely down is not hammered
 * once per request, and short enough that a blip costs a minute of loose
 * counting rather than a day of it.
 */
const PERSISTENT_RETRY_MS = 60_000;

/**
 * Per operation, the moment its database counter may be tried again.
 *
 * Per operation rather than global, so one route's outage does not mute the
 * others — the same reason the latch it replaces was keyed this way.
 */
const persistentQuotaUnavailableUntil = new Map<AiOperation, number>();

function persistentQuotaWorthTrying(operation: AiOperation): boolean {
  const until = persistentQuotaUnavailableUntil.get(operation);

  if (until === undefined) return true;
  if (until > Date.now()) return false;

  persistentQuotaUnavailableUntil.delete(operation);
  return true;
}

/*
 * The fallback's day, and deliberately still UTC.
 *
 * The real counter rolls over on the reader's own midnight — the database
 * function reads the zone their device reported. This one cannot: it exists
 * precisely for the moments the database is unreachable, which is also when
 * the zone is unreadable. A safety net whose window is off by a few hours is
 * doing its job; a safety net that needs the thing that just failed is not.
 */
function utcDayKey(now: number) {
  return new Date(now).toISOString().slice(0, 10);
}

function memoryKey(userId: string, operation: AiOperation, now: number) {
  return `${operation}:${userId}:${utcDayKey(now)}`;
}

function consumeInMemory(userId: string, operation: AiOperation, limit: number) {
  const now = Date.now();
  const key = memoryKey(userId, operation, now);
  const window = memoryWindows.get(key);

  if (window && window.count >= limit) return false;

  if (!window) {
    const dayKey = utcDayKey(now);
    const tomorrowUtc =
      new Date(`${dayKey}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000;
    memoryWindows.set(key, { count: 1, resetsAt: tomorrowUtc });
  } else {
    window.count += 1;
  }

  return true;
}

function refundInMemory(userId: string, operation: AiOperation) {
  const key = memoryKey(userId, operation, Date.now());
  const window = memoryWindows.get(key);
  if (window) window.count = Math.max(0, window.count - 1);
}

/**
 * Drops day-keys that can no longer be reached.
 *
 * Without this the map grows for the life of the process, one entry per user
 * per operation per day. It is small, but it is also unbounded, and the
 * sweep is a walk over a map that in practice holds a handful of rows.
 */
function forgetExpiredWindows(now: number) {
  for (const [key, window] of memoryWindows) {
    if (window.resetsAt <= now) memoryWindows.delete(key);
  }
}

/**
 * Spends one request, and says whether the reader had one to spend.
 *
 * Call this *before* the model, and pair every `true` with either a delivered
 * answer or a {@link refundDailyQuota}.
 */
export async function consumeDailyQuota(
  supabase: Supabase,
  userId: string,
  operation: AiOperation,
  limit: number,
): Promise<boolean> {
  if (persistentQuotaWorthTrying(operation)) {
    const { data, error } = await supabase.rpc("consume_ai_daily_quota", {
      p_operation: operation,
      p_limit: limit,
    });

    if (!error) {
      // Answered, so whatever was wrong is over. Nothing to hold back.
      persistentQuotaUnavailableUntil.delete(operation);

      const rows = data as Array<{ allowed?: boolean }> | null;
      return rows?.[0]?.allowed === true;
    }

    persistentQuotaUnavailableUntil.set(
      operation,
      Date.now() + PERSISTENT_RETRY_MS,
    );

    console.warn(
      "Persistent AI quota is unavailable; using the in-memory safety limit "
        + `for the next ${PERSISTENT_RETRY_MS / 1_000}s.`,
      { operation, code: error.code },
    );
  }

  forgetExpiredWindows(Date.now());
  return consumeInMemory(userId, operation, limit);
}

/**
 * Hands a spent request back after the model failed to answer.
 *
 * Never throws and never reports: this runs on a path that is already
 * returning an error to the reader, and a failed refund must not become a
 * second, more confusing failure. The worst case is that the reader is
 * charged for a call that produced nothing, which is exactly the behaviour
 * this replaces.
 */
export async function refundDailyQuota(
  supabase: Supabase,
  userId: string,
  operation: AiOperation,
): Promise<void> {
  /*
   * Refunded wherever it was charged. `persistentQuotaWorthTrying` is not
   * used here: it clears an expired hold as a side effect, and a refund
   * must land on the counter that took the charge a moment ago, not on
   * whichever one happens to be available now.
   */
  const heldUntil = persistentQuotaUnavailableUntil.get(operation);

  if (heldUntil !== undefined && heldUntil > Date.now()) {
    refundInMemory(userId, operation);
    return;
  }

  try {
    const { error } = await supabase.rpc("refund_ai_daily_quota", {
      p_operation: operation,
    });

    if (error) {
      console.warn("Could not refund an AI request.", {
        operation,
        code: error.code,
      });
    }
  } catch {
    // See above: a refund is a courtesy and must stay silent.
  }
}

/** Test seam. The maps are module state and each case needs a clean one. */
export function resetDailyQuotaStateForTests() {
  memoryWindows.clear();
  persistentQuotaUnavailableUntil.clear();
}
