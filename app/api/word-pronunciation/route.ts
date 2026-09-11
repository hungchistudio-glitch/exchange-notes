import { NextResponse } from "next/server";

import { consumeDailyQuota, refundDailyQuota } from "@/lib/ai/dailyQuota";
import { readBoundedInteger } from "@/lib/ai/modelConfig";
import { getPhonetics, type Phonetics } from "@/lib/pronunciation";
import { transcribe } from "@/lib/pronunciation/ipaSource";
import { isLanguageCode, type LanguageCode } from "@/lib/languages";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 160;
const MAX_BATCH_ITEMS = 40;
const MAX_BATCH_CHARACTERS = 2_400;
const OPERATION = "phonetic_transcription" as const;
const MAX_REQUESTS_PER_DAY = readBoundedInteger(
  process.env.PHONETIC_TRANSCRIPTION_DAILY_USER_LIMIT,
  100,
  1,
  1_000,
);

/*
 * Phonetic annotation for a word, in whichever systems its language uses.
 *
 * en / es / fr / it  →  IPA        (lib/pronunciation/ipaSource.ts)
 * zh-TW              →  zhuyin + pinyin, computed locally
 *
 * Signed-in only. It was open, which was fine while the only thing behind
 * it was a free public dictionary. It now reaches a rate-limited model on a
 * cache miss, and an open endpoint that can spend quota is an open endpoint
 * that will.
 */

/** Everything this app can annotate `text` with, given its language. */
async function annotate(
  text: string,
  code: LanguageCode,
  budget: {
    consume: () => Promise<boolean>;
    refund: () => Promise<void>;
  },
): Promise<{
  phonetics: Phonetics & { ipa?: string };
  limited: boolean;
}> {
  const trimmed = text.trim();
  if (!trimmed) return { phonetics: {}, limited: false };

  // Computed locally — no network, no quota — so a failed IPA lookup can
  // never take zhuyin and pinyin down with it.
  const local = getPhonetics(trimmed, code);

  const transcription = await transcribe([trimmed], code, budget);
  const ipa = transcription.found.get(trimmed);

  return {
    phonetics: ipa ? { ...local, ipa } : local,
    limited: transcription.limited.length > 0,
  };
}

const EMPTY = {
  phonetics: {},
  englishPronunciation: "",
  pinyin: "",
  zhuyin: "",
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const budget = {
      consume: () =>
        consumeDailyQuota(
          supabase,
          user.id,
          OPERATION,
          MAX_REQUESTS_PER_DAY,
        ),
      refund: () => refundDailyQuota(supabase, user.id, OPERATION),
    };

    const body = (await request.json()) as {
      text?: string;
      texts?: unknown;
      language?: string;
      english?: string;
      chinese?: string;
    };

    /*
     * Batch form. A vocabulary drawer opens with a handful of words at
     * once, and asking for them together is the difference between quota
     * that scales with words and quota that scales with taps.
     */
    if (Array.isArray(body.texts) && isLanguageCode(body.language)) {
      const language = body.language;

      if (
        body.texts.length > MAX_BATCH_ITEMS ||
        body.texts.some((value) => typeof value !== "string")
      ) {
        return NextResponse.json(
          { error: "Invalid pronunciation batch" },
          { status: 400 },
        );
      }

      const texts = body.texts
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean);

      if (
        texts.some((text) => text.length > MAX_TEXT_LENGTH) ||
        texts.reduce((total, text) => total + text.length, 0) >
          MAX_BATCH_CHARACTERS
      ) {
        return NextResponse.json(
          { error: "Pronunciation text is too long" },
          { status: 413 },
        );
      }

      const { found, unavailable, limited } = await transcribe(
        texts,
        language,
        budget,
      );

      if (limited.length > 0) {
        return NextResponse.json(
          { error: "Daily pronunciation limit reached", code: "daily_limit" },
          { status: 429 },
        );
      }

      return NextResponse.json({
        phonetics: Object.fromEntries(
          texts.map((text) => {
            const local = getPhonetics(text, language);
            const ipa = found.get(text);
            return [text, ipa ? { ...local, ipa } : local];
          }),
        ),
        /*
         * The words the lookup could not reach, as opposed to the ones it
         * reached and found nothing for. The caller caches the second and
         * must not cache the first — otherwise one busy minute becomes a
         * word that is permanently un-annotated.
         */
        unavailable,
      });
    }

    // One text, one language.
    if (typeof body.text === "string" && isLanguageCode(body.language)) {
      if (body.text.trim().length > MAX_TEXT_LENGTH) {
        return NextResponse.json(
          { error: "Pronunciation text is too long" },
          { status: 413 },
        );
      }

      const result = await annotate(body.text, body.language, budget);

      if (result.limited) {
        return NextResponse.json(
          { error: "Daily pronunciation limit reached", code: "daily_limit" },
          { status: 429 },
        );
      }

      const { phonetics } = result;

      return NextResponse.json({
        phonetics,
        // Legacy mirror, while the callers that read these three are
        // migrated. Only ever populated for the language each belonged to.
        englishPronunciation: phonetics.ipa ?? "",
        pinyin: phonetics.pinyin ?? "",
        zhuyin: phonetics.zhuyin ?? "",
      });
    }

    /*
     * Legacy form: the two halves of an English/Chinese pair, named by
     * language. The field names are the declaration — `chinese` can only
     * ever have been zh-TW.
     */
    const english = body.english?.trim() ?? "";
    const chinese = body.chinese?.trim() ?? "";

    if (
      english.length > MAX_TEXT_LENGTH ||
      chinese.length > MAX_TEXT_LENGTH
    ) {
      return NextResponse.json(
        { error: "Pronunciation text is too long" },
        { status: 413 },
      );
    }

    const chinesePhonetics = getPhonetics(chinese, "zh-TW");
    const englishTranscription = english
      ? await transcribe([english], "en", budget)
      : { found: new Map<string, string>(), limited: [] };

    if (englishTranscription.limited.length > 0) {
      return NextResponse.json(
        { error: "Daily pronunciation limit reached", code: "daily_limit" },
        { status: 429 },
      );
    }

    const englishPronunciation =
      englishTranscription.found.get(english) ?? "";

    return NextResponse.json({
      phonetics: {
        ...chinesePhonetics,
        ...(englishPronunciation ? { ipa: englishPronunciation } : {}),
      },
      englishPronunciation,
      pinyin: chinesePhonetics.pinyin ?? "",
      zhuyin: chinesePhonetics.zhuyin ?? "",
    });
  } catch (error) {
    console.error("Word pronunciation lookup failed:", error);

    return NextResponse.json(EMPTY);
  }
}
