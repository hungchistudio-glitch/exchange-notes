"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LanguageCode } from "@/lib/languages";
import type { VocabularyItem } from "@/lib/types/app";

/*
 * How many batches one session will run unprompted.
 *
 * A library is filled twenty words at a time, so this covers five hundred —
 * enough that an ordinary library finishes in one sitting rather than being
 * walked over across a week of visits, and still a hard stop for anyone who
 * has far more.
 *
 * It was ten, which was the right number for a loop that could not survive a
 * hiccup: there was no point budgeting for two hundred words when a single
 * failed batch ended the run at twenty.
 */
const MAX_BATCHES_PER_SESSION = 25;

/*
 * How many times in a row a batch may fail before the language is given up on.
 *
 * A busy model, a dropped connection and a rate limit all look the same from
 * here and all pass. What does not pass is the same failure three times in a
 * row, which is a wall rather than a hiccup.
 */
const MAX_CONSECUTIVE_FAILURES = 3;

/** Backoff between retries, one entry per attempt after the first. */
const RETRY_DELAY_MS = [1500, 4000];

function wait(ms: number, signal: { cancelled: boolean }): Promise<void> {
  // Cancelled before the wait even starts: resolve now rather than arm a
  // timer. This used to clear the timeout instead, which threw away the one
  // thing that would ever settle the promise — so `runFill` never returned,
  // its `finally` never ran, and the indicator it turns off stayed on for
  // the life of the screen. The caller re-checks `cancelled` immediately
  // after the await, so resolving early stops the loop just as firmly.
  if (signal.cancelled) return Promise.resolve();

  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Fills in the current learning language for words that do not have it yet.
 *
 * Switching to Italian should not leave a library of English cards, and it
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
 * ── The loop lives inside one task, and that is the point ──────────────
 *
 * This used to run one batch per effect run and rely on the refreshed items
 * re-triggering the effect for the next one. Two things went wrong with that,
 * and together they are why a 326-word library never got past forty.
 *
 * A batch that failed set the language aside for the rest of the session —
 * no retry, no resume, and no button anywhere to ask again. One busy minute
 * from the model permanently stranded the library. And because the effect
 * depended on `items`, any re-render that replaced the array mid-flight ran
 * the cleanup, which set `cancelled` and made the in-flight batch return
 * before it could refresh; the re-run then bailed on the in-flight guard and
 * nothing rescheduled it.
 *
 * So the loop is a loop now. It starts once per language, drives itself to
 * the end of the budget, retries a failed batch with backoff, and is
 * cancelled only by unmount or by the language actually changing.
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

  /*
   * Read inside the run rather than depended on.
   *
   * The loop needs to know whether anything is missing before it starts, and
   * needs to call back after each batch — but taking either as a dependency
   * is what let an unrelated re-render cancel the work.
   */
  const itemsRef = useRef(items);
  const onFilledRef = useRef(onFilled);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    onFilledRef.current = onFilled;
  }, [onFilled]);

  /** Languages this session has given up on, so it does not retry into a wall. */
  const abandoned = useRef(new Set<LanguageCode>());

  const runFill = useCallback(
    async (language: LanguageCode, signal: { cancelled: boolean }) => {
      let batches = 0;
      let consecutiveFailures = 0;

      while (batches < MAX_BATCHES_PER_SESSION && !signal.cancelled) {
        let result: { filled?: number; remaining?: number; done?: boolean };

        try {
          const response = await fetch("/api/vocabulary/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ language }),
          });

          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          result = (await response.json()) as typeof result;
        } catch {
          consecutiveFailures += 1;

          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            abandoned.current.add(language);
            return;
          }

          await wait(RETRY_DELAY_MS[consecutiveFailures - 1] ?? 4000, signal);
          continue;
        }

        if (signal.cancelled) return;

        consecutiveFailures = 0;
        batches += 1;

        // Re-reading is what puts the new language on screen, one batch at a
        // time, while the rest is still being worked through.
        onFilledRef.current();

        /*
         * Nothing left, or nothing achieved. The second is the important one:
         * a batch that filled nothing will not fill anything on a retry
         * either, and looping on it is how a quiet background task becomes a
         * quiet background problem.
         */
        if (result.done || !result.filled || result.remaining === 0) {
          abandoned.current.add(language);
          return;
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (loading || !learningLanguage) return;
    if (abandoned.current.has(learningLanguage)) return;

    const missing = itemsRef.current.some(
      (item) => !item.texts?.[learningLanguage]?.trim(),
    );

    if (!missing) return;

    const signal = { cancelled: false };

    /*
     * Started from a microtask, not from the effect body: the run announces
     * itself with setState, and an effect may not reach a state write.
     */
    queueMicrotask(() => {
      if (signal.cancelled) return;

      setFilling(true);

      void runFill(learningLanguage, signal).finally(() => {
        // Reported even when cancelled — the previous version left the
        // indicator stuck on for the life of the screen whenever a run was
        // interrupted, which is a spinner that never stops.
        setFilling(false);
      });
    });

    return () => {
      signal.cancelled = true;
    };
  }, [learningLanguage, loading, runFill]);

  /*
   * Switching away from a language forgets that it was given up on, so
   * coming back to it later in the same session tries again. Whatever went
   * wrong was a minute ago and probably is not still true.
   *
   * The set is captured into the effect rather than read through the ref in
   * the cleanup, which is the same object here but not a habit worth having.
   */
  useEffect(() => {
    const givenUp = abandoned.current;

    return () => {
      if (learningLanguage) givenUp.delete(learningLanguage);
    };
  }, [learningLanguage]);

  return { filling };
}
