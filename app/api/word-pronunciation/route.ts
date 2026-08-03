import { NextResponse } from "next/server";

import { getPronunciationData } from "@/lib/pronunciation";

export const runtime = "nodejs";

type DictionaryPhonetic = {
  text?: string;
};

type DictionaryEntry = {
  phonetic?: string;
  phonetics?: DictionaryPhonetic[];
};

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      english?: string;
      chinese?: string;
    };

    const english = body.english?.trim() ?? "";
    const chinese = body.chinese?.trim() ?? "";

    // Pinyin/zhuyin are computed locally (no network call, no quota risk)
    // — only the English phonetic lookup depends on the external
    // dictionary, and a miss there should never take these down with it.
    const { pinyin, zhuyin } = getPronunciationData({ chinese });

    const englishPronunciation = english
      ? await fetchEnglishPhonetic(english)
      : "";

    return NextResponse.json({
      englishPronunciation,
      pinyin: pinyin ?? "",
      zhuyin: zhuyin ?? "",
    });
  } catch (error) {
    console.error("Word pronunciation lookup failed:", error);

    return NextResponse.json({
      englishPronunciation: "",
      pinyin: "",
      zhuyin: "",
    });
  }
}
