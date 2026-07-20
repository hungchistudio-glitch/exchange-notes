"use client";

import { useEffect, useState } from "react";

import type { SortMode } from "@/components/vocabulary/SortBottomSheet";
import type { VocabularyItem } from "@/lib/types/app";
import { readInteractionMap } from "@/lib/vocabulary/helpers";

type UseVocabularyRankingOptions = {
  items: VocabularyItem[];
  query: string;
  sortMode: SortMode;
};

export default function useVocabularyRanking({
  items,
  query,
  sortMode,
}: UseVocabularyRankingOptions) {
  const [rankedIds, setRankedIds] = useState<string[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState("");

  useEffect(() => {
    if (sortMode === "new" || items.length === 0) {
      setRankedIds([]);
      setRankingLoading(false);
      setRankingError("");
      return;
    }

    const controller = new AbortController();

    async function loadAiRanking() {
      setRankingLoading(true);
      setRankingError("");

      try {
        let newsContext = "";

        if (sortMode === "trending") {
          try {
            const newsResponse = await fetch("/api/daily-news", {
              signal: controller.signal,
              cache: "no-store",
            });

            if (newsResponse.ok) {
              const newsData = await newsResponse.json();
              newsContext = JSON.stringify(newsData).slice(0, 14000);
            }
          } catch (newsError) {
            if ((newsError as Error).name !== "AbortError") {
              console.warn("Could not load news context:", newsError);
            }
          }
        }

        const response = await fetch("/api/vocabulary-rank", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            mode: sortMode,
            items: items.map((item) => ({
              id: item.id,
              word: item.word,
              translation: item.translation,
              status: item.status,
              createdAt: item.created_at,
              partOfSpeech: item.part_of_speech,
              example: item.example_sentence,
            })),
            interactions: readInteractionMap(),
            currentSearch: query.trim(),
            newsContext,
          }),
        });

        const data = (await response.json()) as {
          orderedIds?: string[];
          error?: string;
        };

        if (!response.ok || !Array.isArray(data.orderedIds)) {
          throw new Error(data.error || "Could not rank vocabulary.");
        }

        setRankedIds(data.orderedIds);
      } catch (rankingFailure) {
        if ((rankingFailure as Error).name === "AbortError") {
          return;
        }

        console.error("AI ranking failed:", rankingFailure);

        setRankingError(
          "AI ranking is temporarily unavailable. Using smart fallback.",
        );

        setRankedIds([]);
      } finally {
        if (!controller.signal.aborted) {
          setRankingLoading(false);
        }
      }
    }

    void loadAiRanking();

    return () => controller.abort();
  }, [items, query, sortMode]);

  return {
    rankedIds,
    rankingLoading,
    rankingError,
  };
}
