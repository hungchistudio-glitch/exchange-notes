"use client";

import { useCallback, useState } from "react";

import type {
  VocabularyLookupResult,
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

  const resetLookup = useCallback(() => {
    setLookupStatus("idle");
    setLookupResult(null);
    setLookupError("");
    setLookupDegraded(false);
  }, []);

  const lookupWord = useCallback(async () => {
    const cleanQuery = query.trim();

    if (!cleanQuery || lookupStatus === "loading") return;

    setLookupStatus("loading");
    setLookupError("");
    setLookupDegraded(false);

    try {
      const cachedResult = readCachedLookup(cleanQuery);

      if (cachedResult) {
        setLookupResult(cachedResult);
        setLookupStatus("result");
        return;
      }

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
    lookupWord,
    resetLookup,
  };
}
