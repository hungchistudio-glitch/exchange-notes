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

/*
 * Deliberately touches no state, so the mount effect can await it and assign
 * the result itself. set-state-in-effect is a reachability check: an effect
 * may not call anything that writes state anywhere in its body, however deep
 * past an await that happens.
 */
async function fetchLearningLanguage(): Promise<AppLanguage | null> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // null means "leave whatever is showing alone", which is what the previous
  // early returns did. Falling back to the default here instead would flip a
  // Chinese learner's cards to English on a transient auth hiccup.
  if (userError) {
    console.error(
      "Unable to read current user:",
      userError,
    );

    return null;
  }

  if (!user) {
    return DEFAULT_LANGUAGE;
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

    return null;
  }

  const profile =
    data as ProfileLanguageRow | null;

  return normalizeLearningLanguage(
    profile?.learning_language,
  );
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

  /*
   * Reached from the focus and visibility listeners below and from callers
   * that refresh explicitly, never from an effect body, so it can show the
   * spinner eagerly. The mount path repeats the apply step rather than
   * calling this, which is what keeps the effect clear of the rule.
   */
  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const next = await fetchLearningLanguage();

      if (next) {
        setLearningLanguage(next);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadOnMount() {
      try {
        const next = await fetchLearningLanguage();

        if (active && next) {
          setLearningLanguage(next);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadOnMount();

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
      active = false;

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
