"use client";

import { useCallback, useState } from "react";

import { reportNetworkFailure } from "@/hooks/useOnline";
import { createClient } from "@/lib/supabase/client";
import {
  applyPending,
  readMirror,
  readOutbox,
  searchLocal,
} from "@/lib/offline/vocabulary";

import type {
  VocabularyLookupResult,
  VocabularyLookupPreview,
  VocabularyLookupStatus,
} from "@/lib/types/vocabularyLookup";

const LOOKUP_CACHE_KEY = "exchange-notes-vocabulary-lookup-v1";
const LOOKUP_CACHE_MAX_ITEMS = 200;
const LOOKUP_CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

type StoredLookup = {
  savedAt: number;
  result: VocabularyLookupResult;
};

type LookupCache = Record<string, StoredLookup>;

function getLookupCacheKey(query: string) {
  return query.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function readLookupCache() {
  try {
    const value = window.localStorage.getItem(LOOKUP_CACHE_KEY);
    if (!value) return {} as LookupCache;
    return JSON.parse(value) as LookupCache;
  } catch {
    return {} as LookupCache;
  }
}

function readCachedLookup(query: string) {
  const key = getLookupCacheKey(query);
  const cache = readLookupCache();
  const stored = cache[key];

  if (!stored) return null;

  if (Date.now() - stored.savedAt > LOOKUP_CACHE_TTL_MS) {
    delete cache[key];

    try {
      window.localStorage.setItem(LOOKUP_CACHE_KEY, JSON.stringify(cache));
    } catch {
      // A blocked/full local cache must never break a word lookup.
    }

    return null;
  }

  return stored.result;
}

function storeCachedLookup(query: string, result: VocabularyLookupResult) {
  try {
    const key = getLookupCacheKey(query);
    const cache = readLookupCache();

    cache[key] = {
      savedAt: Date.now(),
      result,
    };

    const trimmedEntries = Object.entries(cache)
      .sort(([, left], [, right]) => right.savedAt - left.savedAt)
      .slice(0, LOOKUP_CACHE_MAX_ITEMS);

    window.localStorage.setItem(
      LOOKUP_CACHE_KEY,
      JSON.stringify(Object.fromEntries(trimmedEntries)),
    );
  } catch {
    // Safari private mode and managed WebViews can reject localStorage writes.
  }
}

/**
 * A word the reader already has, shaped like a lookup result.
 *
 * Reads the mirror rather than the network. Returns null when the word is
 * genuinely not there, which is an honest "I do not know this one" — far
 * better than an invented card, and the reason nothing is guessed here.
 */
async function lookupFromDevice(
  query: string,
): Promise<VocabularyLookupResult | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id;
  if (!userId) return null;

  const [mirror, pending] = await Promise.all([
    readMirror(userId),
    readOutbox(),
  ]);
  const [match] = searchLocal(applyPending(mirror, pending), query);

  if (!match) return null;

  return {
    englishName: match.word ?? "",
    chineseName: match.translation ?? "",
    partOfSpeech: match.part_of_speech ?? "",
    category: match.category ?? "other",
    englishExample: match.example_sentence ?? "",
    chineseExample: match.translated_example ?? "",
  } as VocabularyLookupResult;
}

export default function useVocabularyLookup(query: string) {
  const [lookupStatus, setLookupStatus] =
    useState<VocabularyLookupStatus>("idle");
  const [lookupResult, setLookupResult] =
    useState<VocabularyLookupResult | null>(null);
  const [lookupError, setLookupError] = useState("");

  /**
   * True when the result came from the offline dictionary because the model
   * was unreachable or rate limited. The word and translation are still
   * correct; only the example sentences are canned templates.
   */
  const [lookupDegraded, setLookupDegraded] = useState(false);

  /**
   * Word, translation and part of speech from the offline dictionary, shown
   * while the real lookup is still running. Carries no example sentences on
   * purpose — the offline index invents those, and flashing invented text
   * that the real result overwrites reads as a glitch.
   */
  const [lookupPreview, setLookupPreview] =
    useState<VocabularyLookupPreview | null>(null);

  const resetLookup = useCallback(() => {
    setLookupStatus("idle");
    setLookupResult(null);
    setLookupError("");
    setLookupDegraded(false);
    setLookupPreview(null);
  }, []);

  const lookupWord = useCallback(async () => {
    const cleanQuery = query.trim();

    if (!cleanQuery || lookupStatus === "loading") return;

    setLookupStatus("loading");
    setLookupError("");
    setLookupDegraded(false);
    setLookupPreview(null);

    try {
      const cachedResult = readCachedLookup(cleanQuery);

      if (cachedResult) {
        setLookupResult(cachedResult);
        setLookupStatus("result");
        return;
      }

      // Runs alongside the real lookup rather than before it, so it can only
      // ever fill dead time. Any failure just means no preview.
      void fetch("/api/classify-text/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanQuery }),
      })
        .then((previewResponse) =>
          previewResponse.ok ? previewResponse.json() : null,
        )
        .then((previewData) => {
          if (previewData && !("error" in previewData)) {
            setLookupPreview(previewData as VocabularyLookupPreview);
          }
        })
        .catch(() => undefined);

      const response = await fetch("/api/classify-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleanQuery,
        }),
      });

      const data = await response.json();

      if (!response.ok || "error" in data) {
        throw new Error(
          "error" in data
            ? data.error
            : "Couldn't look up that word.",
        );
      }

      const { degraded, ...result } = data as VocabularyLookupResult & {
        degraded?: boolean;
      };

      // Caching a degraded result would keep the canned example sentences in
      // front of this user long after the model recovered.
      if (!degraded) storeCachedLookup(cleanQuery, result);

      setLookupResult(result);
      setLookupDegraded(Boolean(degraded));
      setLookupStatus("result");
    } catch (lookupErrorValue) {
      /*
       * No connection: answer from the words the reader already has.
       *
       * A model cannot be reached and nothing here pretends otherwise —
       * this will not find something new. But a reader standing in front
       * of a menu abroad is usually reaching for a word they have met
       * before, and that word is on the device. Finding it is the whole
       * difference between an app that stops at the border and one that
       * comes along.
       */
      reportNetworkFailure();

      const local = await lookupFromDevice(cleanQuery);

      if (local) {
        setLookupResult(local);
        // Flagged as degraded, which is what it is: a word already saved,
        // not a fresh lookup. The screen says so rather than passing it
        // off as the real thing.
        setLookupDegraded(true);
        setLookupStatus("result");
        return;
      }

      setLookupError(
        lookupErrorValue instanceof Error
          ? lookupErrorValue.message
          : "Couldn't look up that word.",
      );
      setLookupStatus("error");
    }
  }, [lookupStatus, query]);

  return {
    lookupStatus,
    lookupResult,
    lookupError,
    lookupDegraded,
    lookupPreview,
    lookupWord,
    resetLookup,
  };
}
