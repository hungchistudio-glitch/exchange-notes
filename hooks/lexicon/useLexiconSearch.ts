"use client";

import {
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from "react";

import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import { reportNetworkFailure } from "@/hooks/useOnline";
import { readCachedEntry, writeCachedEntry } from "@/lib/lexicon/cache";
import {
  routeQuery,
  settleLanguages,
  type LanguageRoles,
} from "@/lib/lexicon/languageRouting";
import { orientToLearner } from "@/lib/lexicon/orientation";
import { normalizeQuery } from "@/lib/lexicon/normalize";
import { searchPersonal } from "@/lib/lexicon/personal";
import { classifyQueryKind } from "@/lib/lexicon/queryKind";
import type {
  LexiconEntry,
  LexiconInputMode,
  LexiconPreview,
  LexiconResult,
  LexiconStatus,
} from "@/lib/lexicon/types";
import type { LanguageCode } from "@/lib/languages";
import type { VocabularyItem } from "@/lib/types/app";

/* =========================================================
   One engine, two shells

   Everything the Universal Search and the Cosmic OmniLexicon do to a query
   happens here. They differ in what they draw and in nothing else — the
   language that comes back, the meaning, the saved-or-not, the pronunciation
   and the duplicate state are one computation with two renderings, which is
   the only way "the same word gives the same answer in both modes" can be a
   property rather than a coincidence.

   ── What runs when ─────────────────────────────────────────────────────

   The reader's own words are searched on every keystroke, because that costs
   an array scan over something already in memory. The dictionary is asked
   once, on submit, because that costs a model call — typing "mow" would
   otherwise buy three of them, for "m", "mo" and "mow", and the first two
   are answers to questions nobody asked.
   ========================================================= */

/** How many of the reader's own words to offer. */
const MAX_SAVED_MATCHES = 6;

type UseLexiconSearchOptions = {
  /**
   * The reader's library, live.
   *
   * Passed in rather than fetched here so that saving a word updates the
   * "already in your vocabulary" state in the same render — this hook has no
   * store of its own and cannot go stale behind one.
   */
  items: readonly VocabularyItem[];
};

export type LexiconSearch = {
  query: string;
  setQuery: (value: string) => void;

  status: LexiconStatus;
  /** Null until a lookup has been submitted and something came back. */
  result: LexiconResult | null;
  /** The offline dictionary's early answer, while the real one is in flight. */
  preview: LexiconPreview | null;
  error: string;

  /** The reader's own matching words, live as they type. */
  savedMatches: readonly VocabularyItem[];

  /** How much text is in the field right now. */
  kind: LexiconResult["kind"];

  submit: (value?: string, mode?: LexiconInputMode) => void;
  /**
   * Re-runs the current query with the card led in a language the reader
   * named. The gloss follows the language they read the app in.
   */
  chooseLanguage: (language: LanguageCode) => void;
  retry: () => void;
  reset: () => void;

  /** How the current query arrived. Recorded on a save. */
  inputMode: LexiconInputMode;
};

export default function useLexiconSearch({
  items,
}: UseLexiconSearchOptions): LexiconSearch {
  const { pair } = useDisplayLanguages();
  const { nativeLanguage } = useLearningLanguageContext();

  /*
   * All three roles, not just the pair.
   *
   * The native language decides which of two opposite questions a lookup is:
   * a word typed in a language the reader already reads is a request for the
   * language they study, and a word typed in one they do not read is a
   * request for its meaning. See resolveCardLanguages.
   */
  const roles = useMemo<LanguageRoles>(
    () => ({ learning: pair[0], support: pair[1], native: nativeLanguage }),
    [nativeLanguage, pair],
  );

  const [query, setQueryState] = useState("");
  const [status, setStatus] = useState<LexiconStatus>("idle");
  const [result, setResult] = useState<LexiconResult | null>(null);
  const [preview, setPreview] = useState<LexiconPreview | null>(null);
  const [error, setError] = useState("");
  const [inputMode, setInputMode] = useState<LexiconInputMode>("type");

  /*
   * Every lookup takes a ticket, and only the newest one may write.
   *
   * Two lookups in flight is the ordinary case, not the exotic one: a reader
   * submits, sees the wrong language, and picks the right one before the
   * first answer lands. Without this the slower request wins by arriving
   * last, and the correction the reader just made is undone in front of them.
   */
  const ticketRef = useRef(0);

  /*
   * The query the last submitted lookup was for.
   *
   * State rather than a ref, because the render reads it: the saved-words
   * list under a result has to keep matching the query that result answered,
   * not whatever the field has been edited to since. It is also what
   * chooseLanguage and retry re-run — a lookup that failed still has a query
   * worth retrying, and there is no result object to read it off.
   */
  const [submittedQuery, setSubmittedQuery] = useState("");

  /*
   * Keeps typing responsive without inventing a timer.
   *
   * A debounce would put a fixed delay between the last keystroke and the
   * first match, on every device, whether or not it needed one. Deferring
   * asks React to keep the field ahead of the list instead, so a fast phone
   * shows matches on the same frame and a slow one degrades by dropping
   * intermediate renders rather than by waiting.
   */
  const deferredQuery = useDeferredValue(query);

  /*
   * The words being matched against are whichever the reader is looking at:
   * what they are typing now, or — once a lookup has come back — the query
   * that lookup answered. Otherwise the saved list under a result would keep
   * following the field the reader has since edited.
   */
  const matchAgainst =
    status === "idle" || status === "typing" ? deferredQuery : submittedQuery;

  const savedMatches = useMemo(
    () => searchPersonal(items, matchAgainst, MAX_SAVED_MATCHES),
    [items, matchAgainst],
  );

  const kind = useMemo(() => classifyQueryKind(query), [query]);

  const setQuery = useCallback((value: string) => {
    setQueryState(value);

    /*
     * Editing the field puts the console back to a typing state rather than
     * leaving the previous answer sitting under a query it no longer
     * answers. The answer itself is kept until something replaces it, so
     * adding one letter to a word does not blank the card underneath.
     */
    setStatus((current) =>
      current === "searching" ? current : value.trim() ? "typing" : "idle",
    );

    if (!value.trim()) {
      ticketRef.current += 1;
      setSubmittedQuery("");
      setResult(null);
      setPreview(null);
      setError("");
    }
  }, []);

  const reset = useCallback(() => {
    ticketRef.current += 1;
    setSubmittedQuery("");
    setQueryState("");
    setStatus("idle");
    setResult(null);
    setPreview(null);
    setError("");
    setInputMode("type");
  }, []);

  const run = useCallback(
    async (rawQuery: string, chosenHead: LanguageCode | null) => {
      const text = normalizeQuery(rawQuery);

      if (!text) return;

      const ticket = ticketRef.current + 1;
      ticketRef.current = ticket;
      setSubmittedQuery(text);

      const isCurrent = () => ticketRef.current === ticket;

      setStatus("searching");
      setError("");
      setPreview(null);

      const routing = routeQuery(text, roles, chosenHead);
      const queryKind = classifyQueryKind(text);
      const cacheParts = {
        query: text,
        pair,
        native: roles.native,
        head: chosenHead,
      };

      const settle = (
        raw: LexiconEntry | null,
        flags: { degraded: boolean; offline: boolean },
      ): LexiconResult => {
        const settled = settleLanguages(routing, raw);

        /*
         * The prompt already asks for the language being studied on the
         * headword side, and this is the guarantee behind it: a model that
         * put the two the wrong way round is turned back rather than shown.
         * Display and save read the same object, so a card shown as *papa*
         * is filed as *papa*.
         */
        const oriented = orientToLearner(raw, settled, roles.learning);

        return {
          query: text,
          kind: raw?.kind ?? queryKind,
          languages: oriented?.languages ?? settled,
          // Filled at render from the live library rather than frozen here,
          // so saving a word updates "already in your vocabulary" at once.
          saved: [],
          entry: oriented?.entry ?? raw,
          degraded: flags.degraded,
          offline: flags.offline,
        };
      };

      const cached = readCachedEntry(cacheParts);

      if (cached) {
        if (!isCurrent()) return;

        setResult(settle(cached, { degraded: false, offline: false }));
        setStatus("ready");
        return;
      }

      /*
       * Runs alongside the real lookup rather than before it, so it can only
       * ever fill dead time. Any failure just means no preview.
       */
      void fetch("/api/classify-text/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (!isCurrent() || !data || "error" in data) return;
          setPreview(data as LexiconPreview);
        })
        .catch(() => undefined);

      try {
        const response = await fetch("/api/classify-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, headLanguage: chosenHead ?? undefined }),
        });

        const data = (await response.json()) as LexiconEntry & {
          degraded?: boolean;
          error?: string;
        };

        if (!response.ok || data.error) {
          throw new Error(data.error || "Couldn't look up that word.");
        }

        const { degraded, error: _unused, ...entry } = data;
        void _unused;

        // Caching a degraded result would keep the canned example sentences
        // in front of this reader long after the model recovered.
        if (!degraded) writeCachedEntry(cacheParts, entry);

        if (!isCurrent()) return;

        setPreview(null);
        setResult(settle(entry, { degraded: Boolean(degraded), offline: false }));
        setStatus("ready");
      } catch (lookupError) {
        /*
         * No connection: answer from the words the reader already has.
         *
         * Nothing here pretends this will find something new. But a reader
         * standing in front of a menu abroad is usually reaching for a word
         * they have met before, and that word is on the device. Finding it is
         * the whole difference between an app that stops at the border and
         * one that comes along.
         */
        reportNetworkFailure();

        if (!isCurrent()) return;

        setPreview(null);

        const [local] = searchPersonal(items, text, 1);

        if (local) {
          setResult(settle(null, { degraded: true, offline: true }));
          setStatus("ready");
          return;
        }

        setResult(settle(null, { degraded: true, offline: true }));
        setError(
          lookupError instanceof Error
            ? lookupError.message
            : "Couldn't look up that word.",
        );
        setStatus("error");
      }
    },
    [items, pair, roles],
  );

  const submit = useCallback(
    (value?: string, mode: LexiconInputMode = "type") => {
      const text = normalizeQuery(value ?? query);

      if (!text) return;

      // Voice and camera arrive with text the field does not hold yet.
      if (text !== query) setQueryState(text);
      setInputMode(mode);

      void run(text, null);
    },
    [query, run],
  );

  const chooseLanguage = useCallback(
    (language: LanguageCode) => {
      const text = submittedQuery || normalizeQuery(query);

      if (!text) return;

      void run(text, language);
    },
    [query, run, submittedQuery],
  );

  const retry = useCallback(() => {
    const text = submittedQuery || normalizeQuery(query);

    if (!text) return;

    /*
     * A retry repeats the question that was asked, pin included. Dropping a
     * language the reader chose by hand because the first attempt failed
     * would quietly undo their correction at the worst possible moment.
     *
     * The pin is the *query's* language, never the headword's. Those are the
     * same thing until a result is turned to put the language being studied
     * first — after which re-pinning the headword would answer a question the
     * reader did not ask, and would drop the correction this branch exists to
     * preserve.
     */
    void run(
      text,
      result?.languages.chosen ? result.languages.queryLanguage : null,
    );
  }, [query, result, run, submittedQuery]);

  /*
   * The saved list is attached at the last moment, from the library as it is
   * right now. A result object built during the lookup would carry the
   * library as it was before the reader saved the word they were looking at.
   */
  const resultWithSaved = useMemo<LexiconResult | null>(
    () => (result ? { ...result, saved: savedMatches } : null),
    [result, savedMatches],
  );

  return {
    query,
    setQuery,
    status,
    result: resultWithSaved,
    preview,
    error,
    savedMatches,
    kind,
    submit,
    chooseLanguage,
    retry,
    reset,
    inputMode,
  };
}
