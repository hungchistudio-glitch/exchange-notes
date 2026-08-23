"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import { useVocabulary } from "@/contexts/VocabularyContext";
import type { LanguageCode } from "@/lib/languages";
import { getPronunciationPack } from "@/lib/pronunciation/lab/registry";
import {
  fetchPronunciationProgress,
  recordPronunciationAttempt,
  type AttemptRecord,
} from "@/lib/pronunciation/lab/repository";
import {
  annotateVocabulary,
  rankPronunciationWords,
} from "@/lib/pronunciation/lab/words";
import type {
  PronunciationLanguagePack,
  PronunciationProgress,
  ProgressByUnit,
} from "@/lib/pronunciation/lab/types";
import type { VocabularyPronunciationTarget } from "@/lib/pronunciation/lab/words";
import { createClient } from "@/lib/supabase/client";

/* =========================================================
   The Lab's shared state

   One provider for every screen under /pronunciation: which language is
   being learned, that language's pack, and the learner's progress in it.

   Mounted at the layout so the progress query costs one request for the
   whole visit rather than one per module, and — the part that matters more
   — so switching the learning language is a single event that replaces
   every one of those three things at once. State leaking between languages
   was the specific failure this shape exists to make impossible.
   ========================================================= */

export type LabStatus = "loading" | "ready" | "signed-out" | "error";

/**
 * Progress, together with the language it belongs to.
 *
 * Stored as one value rather than two pieces of state, so there is no
 * moment — not even one render — where a language and a set of numbers can
 * disagree. Switching language does not clear anything; the stale value
 * simply stops matching and is read as "loading" until its replacement
 * arrives.
 */
type ProgressState = {
  language: LanguageCode;
  status: Exclude<LabStatus, "loading">;
  progress: ProgressByUnit;
};

type PronunciationLabValue = {
  language: LanguageCode;
  nativeLanguage: LanguageCode;
  pack: PronunciationLanguagePack;

  progress: ProgressByUnit;
  status: LabStatus;

  /** Words from the learner's own vocabulary, already matched to units. */
  words: VocabularyPronunciationTarget[];
  wordsLoading: boolean;
  /** How many saved words exist in this language at all. */
  wordCount: number;

  refresh: () => Promise<void>;
  /**
   * Saves an attempt and updates local state.
   *
   * Resolves to the new progress row even when the write failed, so a
   * screen can show the change and the caller can decide what to say about
   * not having saved it.
   */
  recordAttempt: (
    attempt: Omit<AttemptRecord, "language">,
  ) => Promise<{ saved: boolean; progress: PronunciationProgress }>;
};

const EMPTY_PROGRESS: ProgressByUnit = {};

const PronunciationLabContext = createContext<PronunciationLabValue | null>(
  null,
);

export function PronunciationLabProvider({ children }: { children: ReactNode }) {
  const { learningLanguage, nativeLanguage } = useLearningLanguageContext();
  const { items, loading: vocabularyLoading } = useVocabulary();

  const pack = useMemo(
    () => getPronunciationPack(learningLanguage),
    [learningLanguage],
  );

  const [loaded, setLoaded] = useState<ProgressState | null>(null);

  /*
   * A mirror of `loaded`, for recordAttempt to read at call time.
   *
   * The alternative is closing over `loaded`, which would rebuild
   * recordAttempt on every answer — and every component holding it would
   * re-render for a value none of them read. The ref is written in an
   * effect, so it is never read during a render that has not committed.
   */
  const loadedRef = useRef<ProgressState | null>(null);

  useEffect(() => {
    loadedRef.current = loaded;
  }, [loaded]);

  const load = useCallback(async (language: LanguageCode) => {
    const result = await fetchPronunciationProgress(createClient(), language);

    /*
     * The language is carried back out with the result and compared before
     * it is stored. Switch from Spanish to French while the Spanish query
     * is in flight, and without this the Spanish rows land afterwards and
     * are read against the French pack.
     */
    setLoaded((current) =>
      result.ok
        ? { language, status: "ready", progress: result.progress }
        : {
            language,
            status: result.reason === "unauthenticated" ? "signed-out" : "error",
            progress: current?.language === language ? current.progress : {},
          },
    );
  }, []);

  useEffect(() => {
    // Started from a microtask rather than from the effect body: the fetch
    // resolves into setState, and an effect body may not reach a state
    // write however far past an await it happens.
    queueMicrotask(() => void load(learningLanguage));
  }, [learningLanguage, load]);

  const refresh = useCallback(
    () => load(learningLanguage),
    [learningLanguage, load],
  );

  const current = loaded?.language === learningLanguage ? loaded : null;
  const progress = current?.progress ?? EMPTY_PROGRESS;
  const status: LabStatus = current?.status ?? "loading";

  const recordAttempt = useCallback<PronunciationLabValue["recordAttempt"]>(
    async (attempt) => {
      const language = learningLanguage;

      const stored = loadedRef.current;
      const known =
        stored?.language === language
          ? stored.progress[attempt.unitId]
          : undefined;

      const result = await recordPronunciationAttempt(
        createClient(),
        { ...attempt, language },
        known,
      );

      setLoaded((state) =>
        state && state.language === language
          ? {
              ...state,
              progress: {
                ...state.progress,
                [attempt.unitId]: result.progress,
              },
            }
          : state,
      );

      return { saved: result.ok, progress: result.progress };
    },
    [learningLanguage],
  );

  /*
   * Two memos, on two different keys, because they cost very different
   * things. Annotating runs a phonetic conversion per saved word and only
   * changes when the library or the language does; ranking is cheap and
   * changes on every recorded attempt. One memo over both would have
   * re-derived the zhuyin for the whole library on every answer.
   */
  const annotated = useMemo(
    () => annotateVocabulary(pack, items),
    [pack, items],
  );

  const words = useMemo(
    () => rankPronunciationWords(pack, annotated, progress),
    [pack, annotated, progress],
  );

  // Already answered by the annotation pass: a word is in this language
  // exactly when it produced an entry.
  const wordCount = annotated.length;

  const value = useMemo<PronunciationLabValue>(
    () => ({
      language: learningLanguage,
      nativeLanguage,
      pack,
      progress,
      status,
      words,
      wordsLoading: vocabularyLoading,
      wordCount,
      refresh,
      recordAttempt,
    }),
    [
      learningLanguage,
      nativeLanguage,
      pack,
      progress,
      status,
      words,
      vocabularyLoading,
      wordCount,
      refresh,
      recordAttempt,
    ],
  );

  return (
    <PronunciationLabContext.Provider value={value}>
      {children}
    </PronunciationLabContext.Provider>
  );
}

export function usePronunciationLab(): PronunciationLabValue {
  const context = useContext(PronunciationLabContext);

  if (!context) {
    throw new Error(
      "usePronunciationLab must be used inside PronunciationLabProvider.",
    );
  }

  return context;
}
