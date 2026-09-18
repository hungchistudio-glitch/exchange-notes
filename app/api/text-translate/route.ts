import { NextResponse } from "next/server";

import { consumeDailyQuota, refundDailyQuota } from "@/lib/ai/dailyQuota";
import { readBoundedInteger } from "@/lib/ai/modelConfig";
import { isLanguageCode } from "@/lib/languages";
import { createClient } from "@/lib/supabase/server";
import {
  readCachedTranslations,
  translateMissing,
} from "@/lib/translation/textSource";

export const runtime = "nodejs";

/*
 * A ceiling of its own, rather than the platform default.
 *
 * Every model call under this route is bounded per attempt now (see
 * lib/ai/modelRequest.ts), so this is the backstop for the sum of them
 * rather than the thing a reader waits out.
 */
export const maxDuration = 60;
/*
 * Translation for text that is not in a row anybody owns.
 *
 * A word card in a conversation belongs to whoever sent it. Their message
 * stays exactly as sent; this is what lets the *rendering* of it speak the
 * reader's language.
 *
 * Signed-in only, and now counted. The file already said "it reaches a
 * rate-limited model on a cache miss, and an open endpoint that can spend
 * quota is an open endpoint that will" — and then checked only that somebody
 * was signed in. Every other model-backed route in the app draws on a daily
 * allowance; this one and the library fill were the two that did not, so one
 * account could spend the project's whole Gemini budget by asking for
 * translations of text it made up.
 */

/** Longest phrase worth sending. These are vocabulary entries and dish names. */
const MAX_TEXT_LENGTH = readBoundedInteger(
  process.env.CARD_TRANSLATION_MAX_TEXT_LENGTH,
  200,
  20,
  2000,
);

/** How many phrases one request may ask about. */
const MAX_TEXTS = 40;

/*
 * How many *model* calls a reader gets in a day.
 *
 * Not requests: a request the cache answers in full costs nothing and is
 * charged nothing, which matters because this route is called by rendering
 * rather than by pressing anything. A screen of already-seen cards is free,
 * however many times it is opened.
 *
 * Sixty calls of up to forty phrases is two thousand four hundred phrases a
 * day that nobody has translated before — far past what reading messages
 * produces, and a firm stop for anything that is not reading messages.
 */
const MAX_CARD_TRANSLATIONS_PER_DAY = readBoundedInteger(
  process.env.CARD_TRANSLATION_DAILY_USER_LIMIT,
  60,
  1,
  500,
);

const OPERATION = "card_translation" as const;

/*
 * The shape the client store expects, plus one field.
 *
 * `unavailable` is "we could not answer these, ask again later" and the
 * client is right to retry it. `quotaExhausted` says the later in question is
 * tomorrow — without it the store retries every thirty seconds for the rest
 * of the day against an answer that cannot change.
 */
function answer(
  found: Map<string, string>,
  unavailable: string[],
  quotaExhausted = false,
) {
  return NextResponse.json({
    texts: Object.fromEntries(found),
    unavailable,
    ...(quotaExhausted ? { quotaExhausted: true } : {}),
  });
}

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
      return answer(new Map(), []);
    }

    const texts = body.texts
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean)
      /*
       * Dropped rather than truncated. A phrase this long is not a dish name
       * or a vocabulary entry, so translating the first two hundred
       * characters of it would answer a question nobody asked — and caching
       * that answer under a key nothing will ask for again.
       */
      .filter((value) => value.length <= MAX_TEXT_LENGTH)
      .slice(0, MAX_TEXTS);

    /*
     * The cache first, and on its own. What it answers is free, and is
     * answered whether or not the reader has any allowance left — a card
     * somebody has already looked up does not stop rendering because
     * somebody else spent the day's budget.
     */
    const { found, missing } = await readCachedTranslations(
      texts,
      body.from,
      body.to,
    );

    if (missing.length === 0) return answer(found, []);

    if (
      !(await consumeDailyQuota(
        user.id,
        OPERATION,
        MAX_CARD_TRANSLATIONS_PER_DAY,
      ))
    ) {
      /*
       * 200, not 429. The cached half is a real answer and the client should
       * keep it; what it must not do is keep asking for the rest.
       */
      return answer(found, missing, true);
    }

    const fresh = await translateMissing(missing, body.from, body.to);

    /*
     * Nothing came back, so nothing was delivered. A busy model charged like
     * an answered one is the arithmetic that turned this app's other limits
     * into two thirds of what they said.
     */
    if (fresh.size === 0) {
      await refundDailyQuota(user.id, OPERATION);
    }

    for (const [text, translated] of fresh) found.set(text, translated);

    return answer(
      found,
      missing.filter((text) => !fresh.has(text)),
    );
  } catch (error) {
    console.error("Card translation lookup failed:", error);

    return answer(new Map(), []);
  }
}
