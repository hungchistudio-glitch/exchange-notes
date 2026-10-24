import { NextResponse } from "next/server";

import { consumeDailyQuota, refundDailyQuota } from "@/lib/ai/dailyQuota";
import { readBoundedInteger } from "@/lib/ai/modelConfig";
import type { HelloSenseKnown } from "@/lib/ai/prompts/helloSense";
import { isValidPair } from "@/lib/hello/pairs";
import {
  cleanPartOfSpeech,
  cleanSense,
  cleanText,
  completeSense,
  lookupFromRpc,
  newHelloId,
  withPhonetics,
} from "@/lib/hello/server";
import type { HelloSense } from "@/lib/hello/types";
import { helloShareUrl } from "@/lib/hello/url";
import { LANGUAGE_CODES, isLanguageCode, type LanguageCode } from "@/lib/languages";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 30;

/*
 * Yumi's hello: making one, and listing the reader's own.
 *
 * POST takes the word as the reader has it — one or two sides, from a saved
 * card or a lookup — the two languages to show it in, and the look. It
 * puts the word into the languages it is missing (one model call, charged
 * as one "hello_sense" against the reader's day), and the database takes
 * the snapshot of who is sending it and what Yumi is wearing from its own
 * copies (supabase/migrations/…_yumi_hello.sql). Nothing a client sends
 * about the sender or the outfit is used.
 *
 * `requestKey` makes it idempotent: the same key twice is the same hello,
 * so a double tap or a retried request never makes two.
 *
 * Looking a word up to share it does not save it, and neither does making
 * a hello: no vocabulary row, no word count, no energy cookie.
 */

const HELLO_DAILY_LIMIT = readBoundedInteger(process.env.HELLO_DAILY_USER_LIMIT, 20, 1, 200);
const IPA_DAILY_LIMIT = readBoundedInteger(process.env.PHONETIC_TRANSCRIPTION_DAILY_USER_LIMIT, 100, 1, 1_000);
const REQUEST_KEY = /^[A-Za-z0-9-]{8,64}$/;

type CreateBody = {
  requestKey?: unknown;
  mode?: unknown;
  pair?: unknown;
  known?: unknown;
};

function readKnown(value: unknown): HelloSenseKnown[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > LANGUAGE_CODES.length) return null;
  const seen = new Set<LanguageCode>();
  const known: HelloSenseKnown[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const { language, text, partOfSpeech } = entry as Record<string, unknown>;
    const clean = cleanText(text);
    if (!isLanguageCode(language) || seen.has(language) || !clean) return null;
    seen.add(language);
    known.push({ language, text: clean, partOfSpeech: cleanPartOfSpeech(partOfSpeech) ?? null });
  }
  return known;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const requestKey = typeof body.requestKey === "string" && REQUEST_KEY.test(body.requestKey) ? body.requestKey : null;
  const mode = body.mode === "yumi-cosmic" ? "yumi-cosmic" : body.mode === "standard" ? "standard" : null;
  const pair = Array.isArray(body.pair) && isValidPair(body.pair) ? body.pair : null;
  const known = readKnown(body.known);
  if (!requestKey || !mode || !pair || !known) {
    return NextResponse.json({ error: "Invalid hello" }, { status: 400 });
  }

  const service = createServiceClient();
  const origin = new URL(request.url).origin;

  /* The same key again: the hello that already exists, not a second one,
     and no second charge. */
  const { data: existing, error: existingError } = await supabase
    .from("yumi_hellos")
    .select("id")
    .eq("request_key", requestKey)
    .maybeSingle();
  /* Hellos cannot be stored right now (the database is unreachable, or
     not migrated yet): say so before anything is charged or translated. */
  if (existingError) return NextResponse.json({ error: "Not available" }, { status: 503 });
  if (existing?.id) {
    const { data } = await service.rpc("get_yumi_hello", { p_id: existing.id });
    const lookup = lookupFromRpc(data);
    return NextResponse.json({
      ...helloShareUrl(existing.id, origin),
      hello: lookup.status === "active" ? lookup.hello : null,
    });
  }

  const sense: HelloSense = {};
  for (const side of known) {
    sense[side.language] = { text: side.text, ...(side.partOfSpeech ? { partOfSpeech: side.partOfSpeech } : {}) };
  }
  const targets = LANGUAGE_CODES.filter((language) => !sense[language]);

  const ipaBudget = {
    consume: () => consumeDailyQuota(user.id, "phonetic_transcription", IPA_DAILY_LIMIT),
    refund: () => refundDailyQuota(user.id, "phonetic_transcription"),
  };

  let charged = false;
  if (targets.length) {
    if (!(await consumeDailyQuota(user.id, "hello_sense", HELLO_DAILY_LIMIT))) {
      return NextResponse.json({ error: "Daily limit reached" }, { status: 429 });
    }
    charged = true;
  }

  const [completed, withSounds] = await Promise.all([
    completeSense(known, targets, { ipaBudget }),
    withPhonetics(sense, ipaBudget),
  ]);
  const full: HelloSense = { ...withSounds, ...completed.sides };

  /* The two languages the hello is shown in must both exist; the others
     may be filled later. Without the pair there is nothing to send. */
  if (!full[pair[0]] || !full[pair[1]]) {
    if (charged) await refundDailyQuota(user.id, "hello_sense");
    return NextResponse.json({ error: "Translation unavailable" }, { status: 503 });
  }
  if (charged && completed.modelFailed) await refundDailyQuota(user.id, "hello_sense");

  /* A hello that is not made is not paid for. */
  const failed = async (status: number, error: string) => {
    if (charged && !completed.modelFailed) await refundDailyQuota(user.id, "hello_sense");
    return NextResponse.json({ error }, { status });
  };

  let id = newHelloId();
  let made = false;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data, error } = await service.rpc("create_yumi_hello", {
      p_owner: user.id,
      p_id: id,
      p_request_key: requestKey,
      p_mode: mode,
      p_pair: pair,
      p_source: known[0].language,
      p_sense: full,
    });
    if (!error) {
      const created = data as { id?: string } | null;
      id = created?.id ?? id;
      made = true;
      break;
    }
    if (error.code === "53400") return failed(429, "Too many hellos today");
    /* Another hello already has this id — vanishingly rare: try a new one. */
    if (error.code === "23505" && attempt === 0) {
      id = newHelloId();
      continue;
    }
    return failed(500, "Could not create");
  }
  if (!made) return failed(500, "Could not create");

  const { data } = await service.rpc("get_yumi_hello", { p_id: id });
  const lookup = lookupFromRpc(data);
  return NextResponse.json({
    ...helloShareUrl(id, origin),
    hello: lookup.status === "active" ? lookup.hello : null,
  });
}

/*
 * The reader's own hellos, newest first: read through their own session,
 * so row-level security decides what comes back, not this route.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("yumi_hellos")
    .select("id, created_at, revoked_at, pair, sense")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "Could not list" }, { status: 500 });

  const origin = new URL(request.url).origin;
  return NextResponse.json({
    hellos: (data ?? []).map((row) => ({
      id: row.id as string,
      createdAt: row.created_at as string,
      revoked: Boolean(row.revoked_at),
      pair: row.pair as string[],
      sense: cleanSense(row.sense),
      ...helloShareUrl(row.id as string, origin),
    })),
  });
}
