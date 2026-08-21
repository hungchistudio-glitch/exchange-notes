import { NextResponse } from "next/server";

import { getPhonetics, type Phonetics } from "@/lib/pronunciation";
import { hasPhonetics, isLanguageCode, type LanguageCode } from "@/lib/languages";

export const runtime = "nodejs";

type DictionaryPhonetic = {
  text?: string;
};

type DictionaryEntry = {
  phonetic?: string;
  phonetics?: DictionaryPhonetic[];
};

/**
 * Languages this app can actually source IPA for.
 *
 * Not the same question as which languages *use* IPA — lib/languages.ts says
 * Spanish, French and Italian all do, and that is correct. It is the source
 * that is narrow: dictionaryapi.dev serves English entries only. Asking it
 * for a Spanish word returns an English miss, not Spanish IPA, so those
 * languages get no IPA rather than a wrong one until a source exists.
 */
const IPA_SOURCE_LANGUAGES: readonly LanguageCode[] = ["en"];

// Free, keyless public dictionary — deliberately NOT Gemini. This endpoint
// can be called once per vocabulary word every time a drawer opens, so
// routing it through the same paid/rate-limited model used elsewhere in
// this app would reintroduce exactly the quota pressure the Daily News
// rework was meant to eliminate. dictionaryapi.dev only covers real
// English dictionary words (proper nouns / invented terms simply won't
// resolve), which is an acceptable trade-off for a "best effort" IPA
// annotation.
async function fetchEnglishPhonetic(word: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
        word
      )}`,
      { signal: AbortSignal.timeout(4000) }
    );

    if (!response.ok) return "";

    const entries = (await response.json()) as DictionaryEntry[];

    for (const entry of entries) {
      if (entry.phonetic?.trim()) return entry.phonetic.trim();

      const withText = entry.phonetics?.find((p) => p.text?.trim());
      if (withText?.text) return withText.text.trim();
    }

    return "";
  } catch (error) {
    console.error("Dictionary lookup failed:", error);
    return "";
  }
}

/**
 * Everything this app can annotate `text` with, given its language.
 *
 * Absent rather than empty for a system the language does not use, so a
 * caller can tell "this language has no zhuyin" from "the lookup came back
 * empty" — the first should render nothing, the second may want a retry.
 */
async function annotate(
  text: string,
  code: LanguageCode
): Promise<Phonetics & { ipa?: string }> {
  const trimmed = text.trim();
  if (!trimmed) return {};

  // Computed locally (no network call, no quota risk) — only the IPA lookup
  // depends on the external dictionary, and a miss there should never take
  // these down with it.
  const local = getPhonetics(trimmed, code);

  if (!hasPhonetics(code, "ipa") || !IPA_SOURCE_LANGUAGES.includes(code)) {
    return local;
  }

  const ipa = await fetchEnglishPhonetic(trimmed);

  return ipa ? { ...local, ipa } : local;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: string;
      language?: string;
      english?: string;
      chinese?: string;
    };

    // Preferred form: one text, one language.
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

    // Legacy form: the two halves of an English/Chinese pair, named by
    // language. The field names are the declaration — `chinese` can only
    // ever have been zh-TW.
    const english = body.english?.trim() ?? "";
    const chinese = body.chinese?.trim() ?? "";

    const chinesePhonetics = getPhonetics(chinese, "zh-TW");
    const englishPronunciation = english
      ? await fetchEnglishPhonetic(english)
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

    return NextResponse.json({
      phonetics: {},
      englishPronunciation: "",
      pinyin: "",
      zhuyin: "",
    });
  }
}
