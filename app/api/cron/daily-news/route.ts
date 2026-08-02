import { NextRequest, NextResponse } from "next/server";

import { generateDailyNews } from "@/lib/dailyNews";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The ONLY place in the app where Daily News actually calls Gemini +
 * Google Search. Triggered on a schedule by Vercel Cron (see vercel.json),
 * never by a user page load. Writes the result into the daily_news_cache
 * table so app/api/daily-news/route.ts can serve it to every user for
 * free until the next scheduled run.
 *
 * Protected by CRON_SECRET so it can't be triggered by anyone else. Vercel
 * automatically sends this header on scheduled invocations; for a manual
 * seed/test run, call it yourself with the same header (see the README
 * note below or ask for the exact curl command).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { cards, generatedAt } = await generateDailyNews();

    const supabase = createServiceClient();

    const { error: upsertError } = await supabase
      .from("daily_news_cache")
      .upsert({
        id: 1,
        cards,
        generated_at: generatedAt,
      });

    if (upsertError) {
      throw new Error(
        `Failed to write daily_news_cache: ${upsertError.message}`
      );
    }

    return NextResponse.json({
      ok: true,
      count: cards.length,
      generatedAt,
    });
  } catch (error) {
    console.error("Daily news cron job failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Daily news generation failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
