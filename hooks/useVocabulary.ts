"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type {
  AppLanguage,
  VocabularyItem,
} from "@/lib/types/app";

export default function useVocabulary() {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [learningLanguage, setLearningLanguage] =
    useState<AppLanguage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadVocabulary() {
      try {
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("Please log in to view your vocabulary.");
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("learning_language")
          .eq("id", user.id)
          .single();

        if (active && profile?.learning_language) {
          setLearningLanguage(
            profile.learning_language as AppLanguage,
          );
        }

        const { data, error: fetchError } = await supabase
          .from("vocabulary_items")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        if (active) {
          setItems((data ?? []) as VocabularyItem[]);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load your vocabulary.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadVocabulary();

    return () => {
      active = false;
    };
  }, []);

  return {
    items,
    setItems,
    learningLanguage,
    loading,
    error,
    setError,
  };
}
