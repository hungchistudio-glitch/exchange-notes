"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_LEARNING_PAIR,
  readLanguageCode,
  type LanguageCode,
} from "@/lib/languages";

type LearningLanguageContextType = {
  learningLanguage: LanguageCode;
  isLearningChinese: boolean;
  isLearningEnglish: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

const LearningLanguageContext =
  createContext<LearningLanguageContextType | null>(null);

/*
 * The column holds prose values on rows written before the migration and
 * language codes on rows written after it, so this reads either and answers
 * in codes. An unreadable value becomes the language the app has always
 * taught rather than nothing, because a screen full of word cards needs a
 * side to lead with.
 */
function normalizeLearningLanguage(value: unknown): LanguageCode {
  return readLanguageCode(value) ?? DEFAULT_LEARNING_PAIR[0];
}

/**
 * App-wide source of truth for "which language is the user learning"
 * (profiles.learning_language) — distinct from the interface/display
 * language (see hooks/i18n/useTranslation). Word cards across the app use
 * this (not interface language) to decide which language is the visual
 * hero vs the supporting translation.
 *
 * Seeded from a server-rendered initial value (see
 * app/(protected)/layout.tsx) so there's no fetch-on-mount waterfall, and
 * refetched on window focus / tab visibility change / explicit refresh()
 * (call refresh() after saving a learning-language change in Settings so
 * every mounted card updates without a full reload). Mounted once here so a
 * screen full of cards costs one Supabase query rather than one per card.
 *
 * This is now the only way to read the learning language. A parallel
 * useLearningLanguage hook used to exist alongside it with the same query and
 * the same focus/visibility refresh; the difference was that it began at
 * English and corrected itself after the fetch, so anything choosing a
 * default from it showed the wrong one first.
 */
export function LearningLanguageProvider({
  children,
  initialLearningLanguage,
}: {
  children: ReactNode;
  initialLearningLanguage: unknown;
}) {
  const [learningLanguage, setLearningLanguage] = useState<LanguageCode>(() =>
    normalizeLearningLanguage(initialLearningLanguage),
  );
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("learning_language")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Unable to refresh learning language:", error);
        return;
      }

      setLearningLanguage(
        normalizeLearningLanguage(
          (data as { learning_language: unknown } | null)?.learning_language,
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    function handleFocus() {
      void refresh();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [refresh]);

  const value = useMemo<LearningLanguageContextType>(
    () => ({
      learningLanguage,
      isLearningChinese: learningLanguage === "zh-TW",
      isLearningEnglish: learningLanguage === "en",
      loading,
      refresh,
    }),
    [learningLanguage, loading, refresh],
  );

  return (
    <LearningLanguageContext.Provider value={value}>
      {children}
    </LearningLanguageContext.Provider>
  );
}

export function useLearningLanguageContext() {
  const context = useContext(LearningLanguageContext);

  if (!context) {
    throw new Error(
      "useLearningLanguageContext must be used inside LearningLanguageProvider.",
    );
  }

  return context;
}
