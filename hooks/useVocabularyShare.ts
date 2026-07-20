"use client";

import { useCallback, useState } from "react";

import { toPinyin } from "@/lib/pinyin";
import type { VocabularyLookupResult } from "@/lib/types/vocabularyLookup";

export default function useVocabularyShare(
  lookupResult: VocabularyLookupResult | null,
) {
  const [lookupCopied, setLookupCopied] = useState(false);

  const showCopiedFeedback = useCallback(() => {
    setLookupCopied(true);

    window.setTimeout(() => {
      setLookupCopied(false);
    }, 1800);
  }, []);

  const getLookupShareText = useCallback(() => {
    if (!lookupResult) return "";

    const pinyin = toPinyin(lookupResult.chineseName);
    const meta = [pinyin, lookupResult.partOfSpeech?.toLowerCase()]
      .filter(Boolean)
      .join(" · ");

    return [
      lookupResult.englishName,
      lookupResult.chineseName,
      meta,
      "",
      lookupResult.englishExample,
      lookupResult.chineseExample,
    ]
      .filter((line, index, array) => {
        if (line !== "") return true;
        return index > 0 && index < array.length - 1;
      })
      .join("\n");
  }, [lookupResult]);

  const shareLookupResult = useCallback(async () => {
    if (!lookupResult) return;

    const shareText = getLookupShareText();

    try {
      if (navigator.share) {
        await navigator.share({
          title: lookupResult.englishName,
          text: shareText,
        });

        return;
      }

      await navigator.clipboard.writeText(shareText);
      showCopiedFeedback();
    } catch (shareError) {
      if (
        shareError instanceof DOMException &&
        shareError.name === "AbortError"
      ) {
        return;
      }

      try {
        await navigator.clipboard.writeText(shareText);
        showCopiedFeedback();
      } catch {
        console.error("Could not share lookup result:", shareError);
      }
    }
  }, [getLookupShareText, lookupResult, showCopiedFeedback]);

  return {
    lookupCopied,
    shareLookupResult,
  };
}
