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
import type { AppLanguage } from "@/lib/types/app";

type LearningLanguageContextType = {
  learningLanguage: AppLanguage;
  isLearningChinese: boolean;
  isLearningEnglish: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

const LearningLanguageContext =
  createContext<LearningLanguageContextType | null>(null);

function normalizeLearningLanguage(value: unknown): AppLanguage {
  return value === "traditional-chinese" ? "traditional-chinese" : "english";
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
 * every mounted card updates without a full reload). Mounted once here
 * instead of calling useLearningLanguage() per card, which would fire one
 * Supabase query per rendered card.
 */
export function LearningLanguageProvider({
  children,
  initialLearningLanguage,
}: {
  children: ReactNode;
  initialLearningLanguage: AppLanguage;
}) {
  const [learningLanguage, setLearningLanguage] = useState<AppLanguage>(
    initialLearningLanguage,
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
          (data as { learning_language: AppLanguage | null } | null)
            ?.learning_language,
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
      isLearningChinese: learningLanguage === "traditional-chinese",
      isLearningEnglish: learningLanguage === "english",
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
