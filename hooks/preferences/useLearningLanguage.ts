"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import type { AppLanguage } from "@/lib/types/app";

const DEFAULT_LANGUAGE: AppLanguage =
  "english";

type ProfileLanguageRow = {
  learning_language: AppLanguage | null;
};

function normalizeLearningLanguage(
  value: unknown,
): AppLanguage {
  return value === "traditional-chinese"
    ? "traditional-chinese"
    : "english";
}

export default function useLearningLanguage() {
  const [
    learningLanguage,
    setLearningLanguage,
  ] = useState<AppLanguage>(
    DEFAULT_LANGUAGE,
  );

  const [loading, setLoading] =
    useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Unable to read current user:",
          userError,
        );
        return;
      }

      if (!user) {
        setLearningLanguage(
          DEFAULT_LANGUAGE,
        );
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select("learning_language")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error(
          "Unable to load learning language:",
          error,
        );
        return;
      }

      const profile =
        data as ProfileLanguageRow | null;

      setLearningLanguage(
        normalizeLearningLanguage(
          profile?.learning_language,
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    function handleFocus() {
      void refresh();
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void refresh();
      }
    }

    window.addEventListener(
      "focus",
      handleFocus,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [refresh]);

  return {
    learningLanguage,
    loading,

    isLearningChinese:
      learningLanguage ===
      "traditional-chinese",

    isLearningEnglish:
      learningLanguage ===
      "english",

    refresh,
  };
}
