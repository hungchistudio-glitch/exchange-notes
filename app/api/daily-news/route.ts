import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Public-facing Daily News endpoint. This performs ZERO Gemini calls — it
 * only reads whatever the cron job (app/api/cron/daily-news/route.ts) most
 * recently wrote into the daily_news_cache table. That means page loads,
 * app traffic spikes, and repeated "New stories" clicks all cost nothing
 * against the Gemini/Google Search quota; the only Gemini usage happens on
 * the fixed schedule defined in vercel.json.
 *
 * The daily_news_cache table has RLS enabled with a public SELECT policy
 * and no INSERT/UPDATE policies, so this route can safely use the regular
 * (anon/user-scoped) Supabase client — only the service-role client used
 * by the cron route can write to it.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("daily_news_cache")
      .select("cards, generated_at")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return NextResponse.json(
        {
          error:
            "Today's stories haven't been generated yet. Please check back shortly.",
        },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store, max-age=0, must-revalidate",
          },
        }
      );
    }

    return NextResponse.json(
      {
        cards: data.cards,
        generatedAt: data.generated_at,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Daily news read error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Daily news is temporarily unavailable.";

    return NextResponse.json(
      { error: message },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      }
    );
  }
}
