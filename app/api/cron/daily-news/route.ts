import { NextRequest, NextResponse } from "next/server";

import { catchUpDailyNews } from "@/lib/news/refillPool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Where Daily News calls Gemini each night. Since 2026-11-15 a night is
 * several knocks on this route: Supabase's scheduler every half hour from
 * 20:00 to 23:30 UTC (private.dispatch_daily_news), and Vercel Cron once at
 * 20:00 as a backstop (vercel.json). Each asks only for what the night still
 * lacks, up to twelve cards, and a full night costs one count
 * (catchUpDailyNews in lib/news/refillPool.ts; Chi: 排程後自動補跑).
 *
 * It appends to daily_news_items rather than replacing a single row, which
 * is what lets Discover hand every reader something they have not seen yet
 * instead of the same batch until tomorrow. The serving route
 * (app/api/daily-news/route.ts) does no AI work while a reader waits.
 *
 * Protected by CRON_SECRET so it cannot be triggered by anyone else. Vercel
 * sends this header automatically on scheduled invocations; the database
 * scheduler reads the same secret from its vault.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await catchUpDailyNews();
    /* A run no model answered is already logged (a warning, or an error on
       the night's last knock); 503 keeps it readable in net._http_response. */
    if (result.decision === "failed") {
      return NextResponse.json({ ok: false, ...result }, { status: 503 });
    }
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
