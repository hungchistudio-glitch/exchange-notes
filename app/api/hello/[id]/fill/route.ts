import { NextResponse } from "next/server";

import type { HelloSenseKnown } from "@/lib/ai/prompts/helloSense";
import { cleanSense, completeSense } from "@/lib/hello/server";
import { isHelloId } from "@/lib/hello/url";
import { isLanguageCode, type LanguageCode } from "@/lib/languages";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 20;

/*
 * One language a hello was made without, asked for by whoever is looking —
 * a signed-out visitor included.
 *
 * Not a translator anyone can use: there is no text in the request, only a
 * hello and a language. The hello's own sides are the source, so the new
 * one is made from the sharer's words like every other side, and the
 * database must first grant a claim — a live hello, still missing that
 * language, at most three tries per hello and a minute apart
 * (claim_yumi_hello_fill). Without the claim, the model is never reached.
 *
 * Refused, it says why, so the page can: 409 with the side when someone
 * else's try already filled it, 410 when the three tries are spent (the
 * page stops offering one), 429 when it is only too soon.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let language: unknown;
  try {
    ({ language } = (await request.json()) as { language?: unknown });
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!isHelloId(id) || !isLanguageCode(language)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: claim } = await service.rpc("claim_yumi_hello_fill", { p_id: id, p_language: language });
  if (!claim) {
    const { data: row } = await service
      .from("yumi_hellos")
      .select("revoked_at, fill_attempts, sense")
      .eq("id", id)
      .maybeSingle();
    if (!row || row.revoked_at) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const filled = cleanSense(row.sense)[language];
    if (filled) return NextResponse.json({ language, side: filled }, { status: 409 });
    if ((row.fill_attempts ?? 0) >= 3) return NextResponse.json({ error: "No tries left" }, { status: 410 });
    return NextResponse.json({ error: "Too soon" }, { status: 429 });
  }

  const sense = cleanSense((claim as { sense?: unknown }).sense);
  const known: HelloSenseKnown[] = (Object.keys(sense) as LanguageCode[]).map((code) => ({
    language: code,
    text: sense[code]!.text,
    partOfSpeech: sense[code]!.partOfSpeech ?? null,
  }));
  if (!known.length) return NextResponse.json({ error: "Not available" }, { status: 409 });

  const { sides } = await completeSense(known, [language]);
  const side = sides[language];
  if (!side) return NextResponse.json({ error: "Translation unavailable" }, { status: 503 });

  const { data: filled } = await service.rpc("fill_yumi_hello_language", {
    p_id: id,
    p_language: language,
    p_side: side,
  });
  if (!filled) return NextResponse.json({ error: "Not available" }, { status: 409 });

  return NextResponse.json({ language, side });
}
