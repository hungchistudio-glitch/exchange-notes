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
import type { LanguageCode } from "@/lib/languages";
import { toLearningPair } from "@/lib/profile/languagePair";

type LearningLanguageContextType = {
  learningLanguage: LanguageCode;
  nativeLanguage: LanguageCode;
  /**
   * Both, in the order everything else uses: learning first, native second.
   *
   * Anything saving a word needs both — which language the word is in and
   * which the translation is in — and deriving the second from the first
   * only works while exactly two languages exist.
   */
  languagePair: readonly [LanguageCode, LanguageCode];
  /**
   * Kept for the Pronunciation Lab, which is the one screen where "which of
   * these two" is a real question — it holds English letters and zhuyin and
   * nothing else. Everywhere else, ask the content what language it is in.
   */
  isLearningChinese: boolean;
  isLearningEnglish: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

const LearningLanguageContext =
  createContext<LearningLanguageContextType | null>(null);

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
  initialNativeLanguage,
}: {
  children: ReactNode;
  initialLearningLanguage: unknown;
  initialNativeLanguage?: unknown;
}) {
  const [pair, setPair] = useState<readonly [LanguageCode, LanguageCode]>(() =>
    toLearningPair(initialLearningLanguage, initialNativeLanguage),
  );

  const [learningLanguage, nativeLanguage] = pair;
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
        .select("learning_language, native_language")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Unable to refresh learning language:", error);
        return;
      }

      const row = data as {
        learning_language: unknown;
        native_language: unknown;
      } | null;

      setPair(toLearningPair(row?.learning_language, row?.native_language));
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
      nativeLanguage,
      languagePair: pair,
      isLearningChinese: learningLanguage === "zh-TW",
      isLearningEnglish: learningLanguage === "en",
      loading,
      refresh,
    }),
    [learningLanguage, nativeLanguage, pair, loading, refresh],
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
