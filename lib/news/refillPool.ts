import type { SupabaseClient } from "@supabase/supabase-js";

import { textQuotaResetAt } from "@/lib/ai/askText";
import { buildLearningCards, selectTodaysArticles } from "@/lib/dailyNews";
import { getDailyNewsLanguages } from "@/lib/news/languagesInUse";
import { createServiceClient } from "@/lib/supabase/service";

/*
 * How long a card stays in the pool.
 *
 * Fourteen days at twelve cards a day settles at roughly a hundred and
 * seventy, which comfortably outruns any reader: six a day for a fortnight is
 * eighty-four. Keeping more would not make the feed feel fresher — nobody
 * reaches the end — and every extra day is rows the unseen query has to sort
 * through on every request.
 */
export const RETENTION_DAYS = 14;

/*
 * How far back to look when deciding whether an article is already in the
 * pool. Wider than the retention window on purpose: an article pruned
 * yesterday would otherwise look new today and come straight back.
 */
export const DEDUPE_WINDOW_DAYS = 45;

const DAY_MS = 24 * 60 * 60 * 1000;

export type RefillResult =
  | { added: 0; note: string }
  | { added: number; requested: number; pruned: boolean };

/**
 * Picks today's articles that are not in the pool yet, turns them into
 * cards, and appends them. Throws when nothing usable came back, so the
 * cron reports a failure rather than a quiet empty day.
 *
 * Moved out of the cron route unchanged, so that a run which came up short
 * can be finished later by the same code (refillPoolIfThin, below).
 */
export async function refillDailyNewsPool(
  supabase: SupabaseClient = createServiceClient(),
): Promise<RefillResult> {
  const dedupeSince = new Date(Date.now() - DEDUPE_WINDOW_DAYS * DAY_MS).toISOString();

  const { data: existing, error: existingError } = await supabase
    .from("daily_news_items")
    .select("source_url")
    .gte("created_at", dedupeSince);

  if (existingError) {
    throw new Error(`Failed to read the news pool: ${existingError.message}`);
  }

  const ingested = new Set(
    (existing ?? []).map((row) => row.source_url as string),
  );

  const articles = await selectTodaysArticles((url) => ingested.has(url));

  if (articles.length === 0) {
    return {
      added: 0,
      note: "No new articles today; the pool already holds every candidate.",
    };
  }

  const languages = await getDailyNewsLanguages();
  const items = await buildLearningCards(articles, languages);

  if (items.length === 0) {
    throw new Error("Gemini produced no usable cards for any of today's articles.");
  }

  const { error: insertError } = await supabase.from("daily_news_items").upsert(
    items.map((item) => ({
      card: item.card,
      category: item.category,
      source_url: item.sourceUrl,
      published_at: item.publishedAt,
    })),
    { onConflict: "source_url", ignoreDuplicates: true },
  );

  if (insertError) {
    throw new Error(`Failed to write the news pool: ${insertError.message}`);
  }

  const pruneBefore = new Date(Date.now() - RETENTION_DAYS * DAY_MS).toISOString();

  const { error: pruneError } = await supabase
    .from("daily_news_items")
    .delete()
    .lt("created_at", pruneBefore);

  if (pruneError) {
    console.error("Daily news prune failed:", pruneError.message);
  }

  return { added: items.length, requested: articles.length, pruned: !pruneError };
}

/* =========================================================
   Finishing a run that came up short

   The cron runs once a day, and on 23–26 September it produced nothing and
   on the 27th two cards: the model it asked was out. Nothing tried again
   until the next evening, so a failed night was a lost day.

   Now the news route calls this after it has answered. It does nothing
   unless the last day produced fewer than THIN_DAY cards, nothing while
   every model is out for its daily quota, and nothing if another request
   has tried within the last REFILL_EVERY_MS — the lock row makes that true
   across every server instance, so a busy morning is one refill, not one
   per reader.
   ========================================================= */

/** A full night is six to twelve cards; fewer than this is a night that failed. */
export const THIN_DAY = 4;

/** At most one refill attempt across all instances in this window. */
export const REFILL_EVERY_MS = 3 * 60 * 60 * 1000;

const LOCK_TABLE = "daily_news_refill_lock";
const LOCK_ID = "refill";

export type RefillDecision =
  | "not-thin"
  | "quota-out"
  | "locked"
  | "refilled"
  | "failed";

export async function refillPoolIfThin(
  supabase: SupabaseClient = createServiceClient(),
  now: number = Date.now(),
): Promise<RefillDecision> {
  try {
    const { count, error: countError } = await supabase
      .from("daily_news_items")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(now - DAY_MS).toISOString());

    if (countError) return "failed";
    if ((count ?? 0) >= THIN_DAY) return "not-thin";

    /* Asking now would only be refused again; the reset is the next chance. */
    if (await textQuotaResetAt()) return "quota-out";

    /*
     * Claim the attempt: move the lock forward only if it is older than the
     * window. Two instances racing here both run the same UPDATE, and only
     * one of them gets the row back.
     */
    const { data: claimed, error: lockError } = await supabase
      .from(LOCK_TABLE)
      .update({ started_at: new Date(now).toISOString() })
      .eq("id", LOCK_ID)
      .lt("started_at", new Date(now - REFILL_EVERY_MS).toISOString())
      .select("id");

    if (lockError || !claimed || claimed.length === 0) return "locked";

    await refillDailyNewsPool(supabase);
    return "refilled";
  } catch (error) {
    console.error("Daily news refill failed:", error);
    return "failed";
  }
}
