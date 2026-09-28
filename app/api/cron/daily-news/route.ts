import { NextRequest, NextResponse } from "next/server";

import { refillDailyNewsPool } from "@/lib/news/refillPool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Where Daily News calls Gemini each night, on a schedule by Vercel Cron
 * (see vercel.json). The work itself is lib/news/refillPool.ts, which the
 * news route also runs — after answering — when a night came up short.
 *
 * It appends to daily_news_items rather than replacing a single row, which
 * is what lets Discover hand every reader something they have not seen yet
 * instead of the same batch until tomorrow. The serving route
 * (app/api/daily-news/route.ts) does no AI work while a reader waits.
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
    const result = await refillDailyNewsPool();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Daily news cron job failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Daily news generation failed.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
