import { NextResponse } from "next/server";

import { isLanguageCode } from "@/lib/languages";
import { createClient } from "@/lib/supabase/server";
import { translateTexts } from "@/lib/translation/textSource";

export const runtime = "nodejs";

/*
 * Translation for text that is not in a row anybody owns.
 *
 * A word card in a conversation belongs to whoever sent it. Their message
 * stays exactly as sent; this is what lets the *rendering* of it speak the
 * reader's language.
 *
 * Signed-in only. It reaches a rate-limited model on a cache miss, and an
 * open endpoint that can spend quota is an open endpoint that will.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      texts?: unknown;
      from?: string;
      to?: string;
    };

    if (
      !Array.isArray(body.texts) ||
      !isLanguageCode(body.from) ||
      !isLanguageCode(body.to)
    ) {
      return NextResponse.json({ texts: {}, unavailable: [] });
    }

    const texts = body.texts
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 40);

    const { found, unavailable } = await translateTexts(
      texts,
      body.from,
      body.to,
    );

    return NextResponse.json({
      texts: Object.fromEntries(found),
      /*
       * The phrases the lookup could not reach, as opposed to the ones it
       * reached and could not translate. The caller caches the second and
       * must not cache the first.
       */
      unavailable,
    });
  } catch (error) {
    console.error("Card translation lookup failed:", error);

    return NextResponse.json({ texts: {}, unavailable: [] });
  }
}
