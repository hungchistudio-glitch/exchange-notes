import { readDailyNewsCard } from "@/lib/types/dailyNews";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { DEFAULT_LEARNING_PAIR, readLanguageCode } from "@/lib/languages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** How many cards one Discover batch carries. */
const BATCH_SIZE = 8;

const NO_STORE = {
  "Cache-Control": "no-store, max-age=0, must-revalidate",
};

/**
 * Public-facing Daily News endpoint. Performs ZERO Gemini calls — it only
 * reads the pool that the cron job (app/api/cron/daily-news/route.ts) has
 * been filling, so page loads, traffic spikes and repeated radar taps all
 * cost nothing against the Gemini quota.
 *
 * What it adds over simply returning the newest cards is the part the reader
 * actually feels: a signed-in reader gets the newest cards *they have not
 * been shown*, so tapping the Signal Radar produces new stories rather than
 * the same batch with a "you are already up to date" notice.
 *
 * Anonymous readers get the newest cards. There is no one to have seen
 * anything yet, and inventing a device-scoped identity to track that would
 * be storing something about a person who has not signed in.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    /*
     * The reader's history, fetched separately rather than as a join.
     *
     * PostgREST cannot express "rows of A with no matching row in B" across
     * an RLS boundary without a view or an RPC, and the seen table is the one
     * table here a user may read only their own rows of. Two small queries is
     * the honest way to do it: the id list is a few hundred uuids at most,
     * bounded by the pool's own retention.
     */
    let seenIds: string[] = [];

    /*
     * The language every card in this response has to be able to lead in.
     *
     * The pool is shared and is not written in every language on every run,
     * so it always holds cards this reader cannot be shown. Serving them
     * anyway is what made switching to Italian look like it had done
     * nothing: the card arrived, had no Italian, and the screen led in
     * English because that was all it had.
     *
     * Filtering here rather than in the components keeps the batch size
     * honest — eight cards means eight readable cards, not eight rows of
     * which some render blank.
     */
    let learningLanguage = DEFAULT_LEARNING_PAIR[0];

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("learning_language")
        .eq("id", user.id)
        .maybeSingle();

      learningLanguage =
        readLanguageCode(profile?.learning_language) ?? learningLanguage;
    }

    if (user) {
      const { data: seen, error: seenError } = await supabase
        .from("daily_news_seen")
        .select("item_id")
        .eq("user_id", user.id);

      if (seenError) {
        // Not fatal. A reader whose history could not be read should still
        // get news — they just might see something twice.
        console.error("Daily news seen lookup failed:", seenError.message);
      } else {
        seenIds = (seen ?? []).map((row) => row.item_id as string);
      }
    }

    /*
     * Matches both card shapes. The language-keyed cards carry `titles`;
     * the ones written before that carry englishTitle/chineseTitle, which
     * only ever means English and Chinese.
     */
    const leadable =
      learningLanguage === "en"
        ? "card->titles->>en.not.is.null,card->>englishTitle.not.is.null"
        : learningLanguage === "zh-TW"
          ? "card->titles->>zh-TW.not.is.null,card->>chineseTitle.not.is.null"
          : `card->titles->>${learningLanguage}.not.is.null`;

    let query = supabase
      .from("daily_news_items")
      .select("id, card, published_at")
      .or(leadable)
      .order("published_at", { ascending: false })
      .limit(BATCH_SIZE);

    if (seenIds.length > 0) {
      query = query.not("id", "in", `(${seenIds.join(",")})`);
    }

    const { data: unseen, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    let rows = unseen ?? [];
    let exhausted = false;

    /*
     * The pool has run out of things this reader has not seen.
     *
     * Falling back to the newest cards regardless of history is deliberate:
     * an empty feed is a broken screen, and a reader who has genuinely read
     * everything is better served the most recent stories again with an
     * honest flag than an apology and nothing to read. The flag is what lets
     * the UI say something true rather than the old "same batch" notice.
     */
    if (rows.length === 0) {
      exhausted = true;

      const { data: newest, error: newestError } = await supabase
        .from("daily_news_items")
        .select("id, card, published_at")
        .or(leadable)
        .order("published_at", { ascending: false })
        .limit(BATCH_SIZE);

      if (newestError) {
        throw new Error(newestError.message);
      }

      rows = newest ?? [];
    }

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "Today's stories haven't been generated yet. Please check back shortly.",
        },
        { status: 503, headers: NO_STORE }
      );
    }

    return NextResponse.json(
      {
        /*
         * Every stored card goes through the reader, which takes either
         * shape. The pool holds cards written before titles were keyed by
         * language and will until the fourteen-day retention has turned it
         * over; reading them raw would empty the feed for that fortnight.
         *
         * The card's own id is the article URL; the pool row id is what the
         * seen table keys on, so both travel together.
         */
        cards: rows
          .map((row) => {
            const card = readDailyNewsCard(row.card);
            return card ? { ...card, itemId: row.id as string } : null;
          })
          .filter((card): card is NonNullable<typeof card> => card !== null),
        generatedAt: rows[0].published_at,
        exhausted,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("Daily news read error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Daily news is temporarily unavailable.";

    return NextResponse.json(
      { error: message },
      { status: 500, headers: NO_STORE }
    );
  }
}
