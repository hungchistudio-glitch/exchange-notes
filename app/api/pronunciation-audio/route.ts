import { NextResponse } from "next/server";

/**
 * Real human recordings for a single English word.
 *
 * The app already talks to dictionaryapi.dev for IPA text and has always
 * thrown the recordings away — app/api/word-pronunciation reads
 * `phonetics[].text` and ignores `phonetics[].audio`, which is why every
 * sound in the pronunciation lab was speech synthesis reading a word aloud
 * rather than a person saying it.
 *
 * The recordings come from Wiktionary and are hosted on Wikimedia Commons
 * under CC BY / BY-SA. That licence is the reason this is the source and not
 * a dictionary site whose terms forbid reuse: the audio can actually ship.
 * The licence name travels with each clip so attribution can be shown.
 *
 * UK and US are returned separately, which is the same split a learner's
 * dictionary shows and something the app has never had.
 */

export const runtime = "nodejs";

type DictionaryPhonetic = {
  text?: string;
  audio?: string;
  sourceUrl?: string;
  license?: { name?: string; url?: string };
};

type DictionaryEntry = {
  phonetics?: DictionaryPhonetic[];
};

export type PronunciationClip = {
  text: string;
  audio: string;
  license: string;
  sourceUrl: string;
};

type Payload = {
  word: string;
  uk: PronunciationClip | null;
  us: PronunciationClip | null;
};

/*
 * A word's recording never changes, so a resolved lookup is kept for the life
 * of the server process. Without this the lab would re-ask the same public API
 * for "cat" on every single tap.
 */
const cache = new Map<string, Payload>();

const MAX_CACHE_ENTRIES = 2000;

function toClip(phonetic: DictionaryPhonetic): PronunciationClip | null {
  const audio = phonetic.audio?.trim();

  if (!audio) return null;

  return {
    text: phonetic.text?.trim() ?? "",
    audio,
    license: phonetic.license?.name?.trim() ?? "",
    sourceUrl: phonetic.sourceUrl?.trim() ?? "",
  };
}

export async function GET(request: Request) {
  const word = new URL(request.url).searchParams
    .get("word")
    ?.trim()
    .toLowerCase();

  if (!word || !/^[a-z][a-z'-]{0,31}$/.test(word)) {
    return NextResponse.json(
      { error: "A single English word is required." },
      { status: 400 },
    );
  }

  const cached = cache.get(word);

  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  const empty: Payload = { word, uk: null, us: null };

  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: AbortSignal.timeout(4000) },
    );

    if (!response.ok) {
      // Not cached: a 404 here means "no entry today", and a rate limit means
      // "ask again later". Remembering either would make a temporary gap
      // permanent.
      return NextResponse.json(empty, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const entries = (await response.json()) as DictionaryEntry[];

    const payload: Payload = { word, uk: null, us: null };
    let unmarked: PronunciationClip | null = null;

    for (const entry of entries) {
      for (const phonetic of entry.phonetics ?? []) {
        const clip = toClip(phonetic);

        if (!clip) continue;

        // Accent is read off the filename, which is how the upstream data
        // marks it: .../cat-uk.mp3 against .../cat-us.mp3.
        if (/-uk\.\w+$/i.test(clip.audio)) {
          payload.uk ??= clip;
        } else if (/-us\.\w+$/i.test(clip.audio)) {
          payload.us ??= clip;
        } else if (!/-[a-z]{2}\.\w+$/i.test(clip.audio)) {
          unmarked ??= clip;
        }
      }
    }

    /*
     * Only a genuinely unmarked recording stands in for a missing accent.
     *
     * The upstream data also carries -au, -ca, -in and others, and an earlier
     * version let those fill an empty slot: "snake" came back with
     * snake-au.mp3 presented as the UK pronunciation. On a screen whose whole
     * claim is that these two columns are UK and US, that is worse than an
     * empty column.
     */
    payload.us ??= unmarked;
    payload.uk ??= unmarked;

    if (payload.uk || payload.us) {
      if (cache.size >= MAX_CACHE_ENTRIES) {
        cache.clear();
      }

      cache.set(word, payload);
    }

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": payload.uk || payload.us
          ? "public, max-age=86400"
          : "no-store",
      },
    });
  } catch (error) {
    console.error("Pronunciation audio lookup failed:", {
      word,
      message: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.json(empty, {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
