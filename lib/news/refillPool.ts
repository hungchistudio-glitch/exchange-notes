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

/*
 * The models answered no batch at all: busy (503), out of quota, or hanging
 * past the run's time. That is the weather of the free tier, not a fault,
 * and the next run asks again; so it is logged as a warning, and an error is
 * kept for the one thing worth reading in the morning, a night that ended
 * short (reportShortNight). Anything else, such as a database refusing a
 * write, is still thrown as itself and logged as an error.
 * (Chi, 2026-11-22: 錯誤紀錄降噪.)
 */
export class ModelsAnsweredNothing extends Error {
  constructor() {
    super("Gemini produced no usable cards for any of today's articles.");
    this.name = "ModelsAnsweredNothing";
  }
}

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
  {
    limit,
    have = new Set<string>(),
  }: {
    /** At most this many new cards: what the night still lacks. */
    limit?: number;
    /** Categories the night already has; the others come first. */
    have?: ReadonlySet<string>;
  } = {},
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

  const candidates = await selectTodaysArticles((url) => ingested.has(url));
  /* The categories the night lacks first, one story each, so a run fills
     World, Japan and Korea before a third Art story (fourteen slots, twelve
     cards); stable otherwise, keeping the slots' own order. */
  const firstOfItsKind = new Set<string>();
  const articles = limit === undefined
    ? candidates
    : candidates
      .map((article, index) => {
        const missing = !have.has(article.category) && !firstOfItsKind.has(article.category);
        firstOfItsKind.add(article.category);
        return { article, index, missing };
      })
      .sort((a, b) => Number(b.missing) - Number(a.missing) || a.index - b.index)
      .slice(0, Math.max(0, limit))
      .map(({ article }) => article);

  if (articles.length === 0) {
    return {
      added: 0,
      note: "No new articles today; the pool already holds every candidate.",
    };
  }

  const languages = await getDailyNewsLanguages();
  const items = await buildLearningCards(articles, languages);

  if (items.length === 0) {
    throw new ModelsAnsweredNothing();
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

/*
 * Fewer than this is a night that lost a batch.
 *
 * It was four, which caught a night that lost everything but not one that
 * lost half: 5 cards on 2026-11-10 and 6 on the 12th, each batch the first
 * model refusing 503 and the second hanging to its 504. The fortnight to
 * 2026-11-13 shows what a whole night makes: 8 to 11 cards, never fewer
 * when no batch failed. So eight (Chi, 2026-11-13: 不到 8 張就白天補做).
 *
 * A refill takes only articles the pool does not hold, so the lost batch's
 * articles come back first, and a night that was short only because the
 * feeds were quiet costs nothing more than the feed reads: with no new
 * article there is nothing to ask a model.
 */
export const THIN_DAY = 8;

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
    const recent = count ?? 0;

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

    await refillDailyNewsPool(supabase, { limit: DAILY_TARGET - recent });
    return "refilled";
  } catch (error) {
    if (error instanceof ModelsAnsweredNothing) {
      console.warn("Daily news refill: no model answered; the next one tries again.");
    } else {
      console.error("Daily news refill failed:", error);
    }
    return "failed";
  }
}

/* =========================================================
   The night's run, and catching up on it (Chi, 2026-11-15: 排程後自動補跑)

   One run a night lost batches on most nights: the first model refusing
   with 503, the second hanging to a 504 at nineteen seconds, and the batch
   after it left no time to start inside the sixty-second limit. The nights
   to 2026-11-15 made 4 to 11 cards against twelve, and 2026-11-05 made none.
   A refusal costs no time and a later ask usually answers (a refill at 00:03
   UTC on 2026-11-15 made six cards after the night had made four).

   So the night is now several runs. Supabase's scheduler knocks on the cron
   route every half hour from 20:00 to 23:30 UTC (Vercel's own daily cron, at
   20:00, stays as a backstop), and each knock asks for what the night still
   lacks, in the categories it lacks first, until it has DAILY_TARGET cards.
   A full night costs nothing more than a count. The main run moved from
   22:00 to 20:00 UTC (Chi chose) so the catch-ups end before Taiwan's
   morning, 07:30 there.
   ========================================================= */

/** Twelve slots, so twelve cards make a full night. */
export const DAILY_TARGET = 12;

/** When the night's runs begin; its cards are counted from here. */
export const NIGHT_STARTS_UTC_HOUR = 18;

/** Two knocks closer than this are one run: the second is turned away. */
export const CATCH_UP_EVERY_MS = 10 * 60 * 1000;

const CATCH_UP_LOCK_ID = "catch-up";

/** The most recent NIGHT_STARTS_UTC_HOUR:00 UTC at or before `now`. */
export function nightStart(now: number): number {
  const start = new Date(now);
  start.setUTCHours(NIGHT_STARTS_UTC_HOUR, 0, 0, 0);
  if (start.getTime() > now) start.setUTCDate(start.getUTCDate() - 1);
  return start.getTime();
}

// The scheduler's last knock of the night is 23:30 UTC (every half hour,
// 20:00 to 23:30, in *_daily_news_catch_up.sql), counted here from
// NIGHT_STARTS_UTC_HOUR; a knock from five minutes before it on is the
// night's last chance.
const LAST_KNOCK_MINUTES = 23 * 60 + 30 - NIGHT_STARTS_UTC_HOUR * 60;

export function isLastKnock(now: number): boolean {
  return now - nightStart(now) >= (LAST_KNOCK_MINUTES - 5) * 60_000;
}

/** The one news error worth reading: the last knock has run and the night is short. */
function reportShortNight(have: number, now: number, why: string) {
  if (have >= DAILY_TARGET || !isLastKnock(now)) return;
  console.error(`Daily news: the night ended with ${have} of ${DAILY_TARGET} cards (${why}).`);
}

export type CatchUpResult =
  | { decision: "full" | "quota-out" | "locked" | "failed"; have: number }
  | { decision: "ran"; have: number; added: number };

/**
 * Claims this run, so two knocks that land together (the Vercel cron and a
 * scheduled one) do not both ask the models. The lock row is made on first
 * use: a missing row is not a held lock.
 */
async function claimCatchUp(supabase: SupabaseClient, now: number): Promise<boolean> {
  const { data: claimed, error } = await supabase
    .from(LOCK_TABLE)
    .update({ started_at: new Date(now).toISOString() })
    .eq("id", CATCH_UP_LOCK_ID)
    .lt("started_at", new Date(now - CATCH_UP_EVERY_MS).toISOString())
    .select("id");
  if (error) return false;
  if (claimed && claimed.length > 0) return true;

  const { data: existing } = await supabase
    .from(LOCK_TABLE)
    .select("id")
    .eq("id", CATCH_UP_LOCK_ID);
  if (existing && existing.length > 0) return false;

  /* First use. Two racing inserts: the primary key lets one through. */
  const { error: insertError } = await supabase
    .from(LOCK_TABLE)
    .insert({ id: CATCH_UP_LOCK_ID, started_at: new Date(now).toISOString() });
  return !insertError;
}

export async function catchUpDailyNews(
  supabase: SupabaseClient = createServiceClient(),
  now: number = Date.now(),
): Promise<CatchUpResult> {
  const { data: tonight, error: countError } = await supabase
    .from("daily_news_items")
    .select("category")
    .gte("created_at", new Date(nightStart(now)).toISOString());
  if (countError) throw new Error(`Failed to read the news pool: ${countError.message}`);

  const have = (tonight ?? []).length;
  if (have >= DAILY_TARGET) return { decision: "full", have };
  if (await textQuotaResetAt()) {
    reportShortNight(have, now, "every model is out for the day");
    return { decision: "quota-out", have };
  }
  if (!(await claimCatchUp(supabase, now))) return { decision: "locked", have };

  let added: number;
  try {
    const result = await refillDailyNewsPool(supabase, {
      limit: DAILY_TARGET - have,
      have: new Set((tonight ?? []).map((row) => row.category as string)),
    });
    added = result.added;
  } catch (error) {
    if (!(error instanceof ModelsAnsweredNothing)) throw error;
    if (isLastKnock(now)) reportShortNight(have, now, "no model answered the last run");
    else console.warn(`Daily news: no model answered this run (${have} of ${DAILY_TARGET}); the next knock asks again.`);
    return { decision: "failed", have };
  }
  reportShortNight(have + added, now, "too few batches answered");
  return { decision: "ran", have, added };
}
