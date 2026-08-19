import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* A batch is eight cards; this is headroom, not a target. */
const MAX_IDS_PER_CALL = 64;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Records that a reader has been shown these cards.
 *
 * Called by the client after a batch renders rather than by the GET that
 * returned it, and the distinction matters: a GET that marked its own
 * results as seen would burn through the pool on any retry, prefetch or
 * double-render, and would count cards nobody ever looked at.
 *
 * Writes go through the user-scoped client, so the RLS policy on
 * daily_news_seen is what guarantees a reader can only ever record rows for
 * themselves — this route never has to check.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Anonymous readers have no history to keep. Silently fine rather than an
    // error: the client calls this unconditionally and a signed-out session
    // is a normal state, not a failure.
    if (!user) {
      return NextResponse.json({ ok: true, recorded: 0 });
    }

    const body = (await request.json()) as { itemIds?: unknown };

    const itemIds = Array.isArray(body.itemIds)
      ? body.itemIds
          .filter((id): id is string => typeof id === "string" && UUID.test(id))
          .slice(0, MAX_IDS_PER_CALL)
      : [];

    if (itemIds.length === 0) {
      return NextResponse.json({ ok: true, recorded: 0 });
    }

    /*
     * Upsert rather than insert: the same card can be shown twice — a reader
     * who reaches the end of the pool gets the newest batch again — and a
     * duplicate key must not turn that into an error.
     */
    const { error } = await supabase.from("daily_news_seen").upsert(
      itemIds.map((itemId) => ({ user_id: user.id, item_id: itemId })),
      { onConflict: "user_id,item_id", ignoreDuplicates: true }
    );

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true, recorded: itemIds.length });
  } catch (error) {
    console.error("Daily news seen write failed:", error);

    /*
     * Reported, never surfaced. Failing to record history costs the reader a
     * repeat later; failing loudly would cost them the batch they are
     * currently reading, which is worse.
     */
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
