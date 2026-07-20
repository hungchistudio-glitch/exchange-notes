"use client";

import { useCallback, useState } from "react";

import type {
  VocabularyLookupResult,
  VocabularyLookupStatus,
} from "@/lib/types/vocabularyLookup";

export default function useVocabularyLookup(query: string) {
  const [lookupStatus, setLookupStatus] =
    useState<VocabularyLookupStatus>("idle");
  const [lookupResult, setLookupResult] =
    useState<VocabularyLookupResult | null>(null);
  const [lookupError, setLookupError] = useState("");

  const resetLookup = useCallback(() => {
    setLookupStatus("idle");
    setLookupResult(null);
    setLookupError("");
  }, []);

  const lookupWord = useCallback(async () => {
    const cleanQuery = query.trim();

    if (!cleanQuery || lookupStatus === "loading") return;

    setLookupStatus("loading");
    setLookupError("");

    try {
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

      setLookupResult(data as VocabularyLookupResult);
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
    lookupWord,
    resetLookup,
  };
}
