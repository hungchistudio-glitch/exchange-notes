"use client";

import { useCallback, useMemo, useState } from "react";

import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import useInterfaceLanguage from "@/hooks/preferences/useInterfaceLanguage";
import { reportNetworkFailure } from "@/hooks/useOnline";
import type { LanguageCode } from "@/lib/languages";
import { toLearningPair } from "@/lib/profile/languagePair";
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

/*
 * v2: the keys inside changed shape, so the old store is abandoned rather
 * than migrated. Every v1 entry is a card in whatever pair the reader
 * happened to be using when they looked the word up, with nothing recording
 * which pair that was — there is no way to file them correctly now, and
 * keeping them would mean serving exactly the cards this bump exists to stop
 * serving.
 */
const LOOKUP_CACHE_KEY = "exchange-notes-vocabulary-lookup-v2";
const LOOKUP_CACHE_MAX_ITEMS = 200;
const LOOKUP_CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

type StoredLookup = {
  savedAt: number;
  result: VocabularyLookupResult;
};

type LookupCache = Record<string, StoredLookup>;

type LanguagePair = readonly [LanguageCode, LanguageCode];

/**
 * The query, and the pair it is being asked in.
 *
 * The pair is the half that was missing, and its absence was not a stale
 * cache — it was a wrong answer. A lookup is not a fact about a word, it is a
 * card: a headword in the language being learned, glossed in the language the
 * reader is supported in. Ask for "mow" while learning French and the answer
 * is *tondre*; switch to English and the same three letters have to come back
 * as an English word. Keyed on the query alone the first card was handed
 * straight back, in a language the reader had just stopped learning, and no
 * amount of switching would shift it until the entry aged out ninety days
 * later.
 *
 * Both server caches were already keyed this way — see the note in
 * app/api/classify-text/route.ts and lib/vocabulary/sharedLookupCache.ts.
 * This layer, closest to the reader, was the one that forgot.
 */
export function getLookupCacheKey(query: string, pair: LanguagePair) {
  const normalized = query
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");

  return `${pair[0]}>${pair[1]}:${normalized}`;
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

function readCachedLookup(query: string, pair: LanguagePair) {
  const key = getLookupCacheKey(query, pair);
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

function storeCachedLookup(
  query: string,
  pair: LanguagePair,
  result: VocabularyLookupResult,
) {
  try {
    const key = getLookupCacheKey(query, pair);
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
  const { learningLanguage, nativeLanguage } = useLearningLanguageContext();
  const interfaceLanguage = useInterfaceLanguage();

  /*
   * Built from the same three inputs the server builds its own pair from, and
   * with the same function, so the key this device files a card under is the
   * pair that card was actually answered in.
   *
   * The interface language belongs in here alongside the two profile columns
   * because it is what decides the gloss side: a French learner reading the
   * app in English is asking for a different card than the same learner
   * reading it in Chinese, and only this argument tells the two apart.
   *
   * The account's copy of the interface language is written on a debounce, so
   * for a moment after the setting changes the server may still answer in the
   * previous pair while this keys under the new one. The cost of that window
   * is a card filed under a key it will not be asked for again — a miss later,
   * never a wrong card now, which is the trade this whole change is about.
   */
  const languagePair = useMemo(
    () => toLearningPair(learningLanguage, nativeLanguage, interfaceLanguage),
    [learningLanguage, nativeLanguage, interfaceLanguage],
  );

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
      const cachedResult = readCachedLookup(cleanQuery, languagePair);

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
      if (!degraded) storeCachedLookup(cleanQuery, languagePair, result);

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
  }, [languagePair, lookupStatus, query]);

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
