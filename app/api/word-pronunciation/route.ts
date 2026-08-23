import { NextResponse } from "next/server";

import { getPhonetics, type Phonetics } from "@/lib/pronunciation";
import { transcribe } from "@/lib/pronunciation/ipaSource";
import { isLanguageCode, type LanguageCode } from "@/lib/languages";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
): Promise<Phonetics & { ipa?: string }> {
  const trimmed = text.trim();
  if (!trimmed) return {};

  // Computed locally — no network, no quota — so a failed IPA lookup can
  // never take zhuyin and pinyin down with it.
  const local = getPhonetics(trimmed, code);

  const ipa = (await transcribe([trimmed], code)).found.get(trimmed);

  return ipa ? { ...local, ipa } : local;
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

      const texts = body.texts
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 40);

      const { found, unavailable } = await transcribe(texts, language);

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
      const phonetics = await annotate(body.text, body.language);

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

    const chinesePhonetics = getPhonetics(chinese, "zh-TW");
    const englishPronunciation = english
      ? ((await transcribe([english], "en")).found.get(english) ?? "")
      : "";

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
