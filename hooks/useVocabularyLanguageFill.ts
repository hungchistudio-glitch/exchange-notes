"use client";

import { useEffect, useRef, useState } from "react";

import type { LanguageCode } from "@/lib/languages";
import type { VocabularyItem } from "@/lib/types/app";

/*
 * How many batches one session will run unprompted.
 *
 * A library is filled twenty words at a time, so this covers 200 — more than
 * most people have, and a hard stop for anyone who has far more. Someone with
 * a thousand words gets the first two hundred while they browse and the rest
 * next time rather than a session that quietly spends an afternoon of quota.
 */
const MAX_BATCHES_PER_SESSION = 10;

/**
 * Fills in the current learning language for words that do not have it yet.
 *
 * Switching to Spanish should not leave a library of English cards, and it
 * should not require finding a button either — the words are already yours,
 * and the language is the one you just chose. So this runs on its own, in the
 * background, whenever a screen that has vocabulary notices some of it is not
 * in the language being learned.
 *
 * Deliberately quiet about it. No blocking, no modal, no progress bar
 * demanding attention: cards fill in as their turn comes and the list is
 * usable throughout. What it does report is whether it is working, so a
 * screen can say so somewhere small rather than leaving a half-translated
 * list looking broken.
 *
 * One request at a time, per mount. Two screens both noticing the same gap
 * would otherwise ask twice for the same words, and the endpoint's own
 * skip-if-present guard would make the second call pure waste rather than a
 * wrong answer — but waste against a rate limit is still a cost.
 */
export function useVocabularyLanguageFill({
  items,
  learningLanguage,
  loading,
  onFilled,
}: {
  items: VocabularyItem[];
  learningLanguage: LanguageCode | null;
  loading: boolean;
  onFilled: () => void;
}) {
  const [filling, setFilling] = useState(false);
  const inFlight = useRef(false);
  const batches = useRef(0);
  const stoppedFor = useRef<LanguageCode | null>(null);

  useEffect(() => {
    // A language change is a fresh budget: the previous one's exhaustion says
    // nothing about this one.
    if (stoppedFor.current !== learningLanguage) {
      stoppedFor.current = null;
      batches.current = 0;
    }
  }, [learningLanguage]);

  useEffect(() => {
    if (loading || !learningLanguage || inFlight.current) return;
    if (stoppedFor.current === learningLanguage) return;
    if (batches.current >= MAX_BATCHES_PER_SESSION) return;

    const missing = items.some(
      (item) => !item.texts?.[learningLanguage]?.trim(),
    );

    if (!missing) return;

    let cancelled = false;
    inFlight.current = true;

    void (async () => {
      // Announced from inside the task rather than beside it: a synchronous
      // setState in an effect body schedules a second render before the work
      // it is describing has started.
      if (!cancelled) setFilling(true);

      try {
        const response = await fetch("/api/vocabulary/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: learningLanguage }),
        });

        if (!response.ok) {
          // Quota, network, a model having a bad minute — all the same answer:
          // stop asking for this language rather than retrying into a wall.
          // The words are safe; they are simply still in the languages they
          // were already in.
          stoppedFor.current = learningLanguage;
          return;
        }

        const result = (await response.json()) as {
          filled?: number;
          remaining?: number;
          done?: boolean;
        };

        if (cancelled) return;

        batches.current += 1;

        // Nothing left, or nothing achieved. The second is the important one:
        // a batch that filled nothing will not fill anything on a retry
        // either, and looping on it is how a quiet background task becomes a
        // quiet background problem.
        if (result.done || !result.filled || result.remaining === 0) {
          stoppedFor.current = learningLanguage;
          onFilled();
          return;
        }

        // Re-reading is what puts the new language on screen. The effect runs
        // again on the fresh items and takes the next batch if any is left.
        onFilled();
      } finally {
        inFlight.current = false;
        if (!cancelled) setFilling(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items, learningLanguage, loading, onFilled]);

  return { filling };
}
