import { NextRequest, NextResponse } from "next/server";

import {
  buildLearningCards,
  selectTodaysArticles,
} from "@/lib/dailyNews";
import { getDailyNewsLanguages } from "@/lib/news/languagesInUse";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/*
 * How long a card stays in the pool.
 *
 * Fourteen days at twelve cards a day settles at roughly a hundred and
 * seventy, which comfortably outruns any reader: six a day for a fortnight is
 * eighty-four. Keeping more would not make the feed feel fresher — nobody
 * reaches the end — and every extra day is rows the unseen query has to sort
 * through on every request.
 */
const RETENTION_DAYS = 14;

/*
 * How far back to look when deciding whether an article is already in the
 * pool. Wider than the retention window on purpose: an article pruned
 * yesterday would otherwise look new today and come straight back.
 */
const DEDUPE_WINDOW_DAYS = 45;

/**
 * The ONLY place in the app where Daily News calls Gemini. Triggered on a
 * schedule by Vercel Cron (see vercel.json), never by a user page load.
 *
 * It appends to daily_news_items rather than replacing a single row, which
 * is what lets Discover hand every reader something they have not seen yet
 * instead of the same batch until tomorrow. The serving route
 * (app/api/daily-news/route.ts) still performs no AI work at all.
 *
 * Protected by CRON_SECRET so it cannot be triggered by anyone else. Vercel
 * sends this header automatically on scheduled invocations.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    const dedupeSince = new Date(
      Date.now() - DEDUPE_WINDOW_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: existing, error: existingError } = await supabase
      .from("daily_news_items")
      .select("source_url")
      .gte("created_at", dedupeSince);

    if (existingError) {
      throw new Error(`Failed to read the news pool: ${existingError.message}`);
    }

    const ingested = new Set(
      (existing ?? []).map((row) => row.source_url as string)
    );

    const articles = await selectTodaysArticles((url) => ingested.has(url));

    /*
     * Nothing new is a valid outcome, not a failure. Every slot's freshest
     * article can already be in the pool on a quiet day, and answering 500
     * would make Vercel retry a run that has nothing to do.
     */
    if (articles.length === 0) {
      return NextResponse.json({
        ok: true,
        added: 0,
        note: "No new articles today; the pool already holds every candidate.",
      });
    }

    /*
     * The pool is written in the languages the accounts actually use, not in
     * a pair chosen at build time. It is one batch a day shared by everyone,
     * which is exactly the case where covering more languages is worth the
     * output — the cost is paid once and divided by every reader.
     */
    const languages = await getDailyNewsLanguages();

    const items = await buildLearningCards(articles, languages);

    if (items.length === 0) {
      throw new Error(
        "Gemini produced no usable cards for any of today's articles."
      );
    }

    const { error: insertError } = await supabase
      .from("daily_news_items")
      .upsert(
        items.map((item) => ({
          card: item.card,
          category: item.category,
          source_url: item.sourceUrl,
          published_at: item.publishedAt,
        })),
        { onConflict: "source_url", ignoreDuplicates: true }
      );

    if (insertError) {
      throw new Error(`Failed to write the news pool: ${insertError.message}`);
    }

    /*
     * Pruning runs after the insert and its failure is reported rather than
     * thrown. A pool that grew a day too long is a smaller problem than a day
     * with no new cards, and the next run will prune it anyway.
     */
    const pruneBefore = new Date(
      Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const { error: pruneError } = await supabase
      .from("daily_news_items")
      .delete()
      .lt("created_at", pruneBefore);

    if (pruneError) {
      console.error("Daily news prune failed:", pruneError.message);
    }

    return NextResponse.json({
      ok: true,
      added: items.length,
      requested: articles.length,
      pruned: !pruneError,
    });
  } catch (error) {
    console.error("Daily news cron job failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Daily news generation failed.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
