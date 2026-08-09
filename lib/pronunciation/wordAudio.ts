"use client";

export type WordAccent = "us" | "uk";

export type WordClip = {
  text: string;
  audio: string;
  license: string;
  sourceUrl: string;
};

type WordAudioPayload = {
  word: string;
  uk: WordClip | null;
  us: WordClip | null;
};

/*
 * Resolved lookups for this session. A word's recording does not change, and
 * the same handful of words are tapped over and over in the lab, so asking
 * twice is pure waste.
 */
const resolved = new Map<string, WordAudioPayload>();

/* Requests already in the air, so ten cards entering view at once produce one
   request per word rather than one per card. */
const inFlight = new Map<string, Promise<void>>();

/* Words the API had nothing for. Remembered so a miss costs one request per
   session instead of one per tap. */
const missing = new Set<string>();

function normalize(word: string): string {
  return word.trim().toLowerCase();
}

/**
 * The clip for a word, if it is already known — synchronous by design.
 *
 * Playback calls this and never awaits. Fetching at the moment of the tap
 * would put a network round trip between pressing play and hearing anything,
 * which is exactly the stutter this is built to avoid: a late recording is
 * worse than an immediate synthesised voice. Anything not yet cached falls
 * back, and warm() below is what makes the cached case the normal one.
 */
export function cachedWordClip(
  word: string,
  accent: WordAccent = "us",
): WordClip | null {
  const payload = resolved.get(normalize(word));

  if (!payload) return null;

  return accent === "uk"
    ? payload.uk ?? payload.us
    : payload.us ?? payload.uk;
}

/**
 * Fetches a word's recordings in the background.
 *
 * Deliberately returns nothing useful and never throws. Callers fire this when
 * a card comes into view and forget about it; if it fails, the only
 * consequence is that the word keeps using speech synthesis.
 */
export function warmWordAudio(word: string): void {
  const key = normalize(word);

  if (
    !key
    || resolved.has(key)
    || missing.has(key)
    || inFlight.has(key)
    || !/^[a-z][a-z'-]{0,31}$/.test(key)
  ) {
    return;
  }

  const request = (async () => {
    try {
      const response = await fetch(
        `/api/pronunciation-audio?word=${encodeURIComponent(key)}`,
        { cache: "force-cache" },
      );

      if (!response.ok) {
        missing.add(key);
        return;
      }

      const payload = (await response.json()) as WordAudioPayload;

      if (payload.uk || payload.us) {
        resolved.set(key, payload);

        // Pull the file itself into the browser cache too. Without this the
        // first play still waits on the download, and the point of warming is
        // that the first play does not wait for anything.
        const clip = payload.us ?? payload.uk;

        if (clip) {
          void fetch(clip.audio, { cache: "force-cache" }).catch(() => {});
        }
      } else {
        missing.add(key);
      }
    } catch {
      // Left out of `missing` on purpose: a network blip should not disqualify
      // the word for the rest of the session.
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, request);
}
