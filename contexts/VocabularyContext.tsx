"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import { createClient } from "@/lib/supabase/client";
import type {
  AppLanguage,
  VocabularyItem,
} from "@/lib/types/app";
import {
  fetchVocabulary,
  getCurrentUser,
} from "@/lib/vocabulary/repository";

type VocabularyContextType = {
  items: VocabularyItem[];
  setItems: Dispatch<SetStateAction<VocabularyItem[]>>;

  learningLanguage: AppLanguage | null;

  loading: boolean;
  error: string;
  setError: Dispatch<SetStateAction<string>>;

  refresh(): Promise<void>;
  addItem(item: VocabularyItem): void;
  removeItem(id: string): void;
  updateItem(item: VocabularyItem): void;
};

const VocabularyContext =
  createContext<VocabularyContextType | null>(null);

export function VocabularyProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [learningLanguage, setLearningLanguage] =
    useState<AppLanguage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { user } = await getCurrentUser();

      if (!user) {
        setItems([]);
        setLearningLanguage(null);
        throw new Error(
          "Please log in to view your vocabulary.",
        );
      }

      const supabase = createClient();

      const [{ data: profile }, rows] = await Promise.all([
        supabase
          .from("profiles")
          .select("learning_language")
          .eq("id", user.id)
          .single(),
        fetchVocabulary(user.id),
      ]);

      setLearningLanguage(
        profile?.learning_language
          ? (profile.learning_language as AppLanguage)
          : null,
      );

      setItems(rows as VocabularyItem[]);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Could not load your vocabulary.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addItem = useCallback((item: VocabularyItem) => {
    setItems((current) => {
      const alreadyExists = current.some(
        (existing) => existing.id === item.id,
      );

      if (alreadyExists) {
        return current.map((existing) =>
          existing.id === item.id ? item : existing,
        );
      }

      return [item, ...current];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((current) =>
      current.filter((item) => item.id !== id),
    );
  }, []);

  const updateItem = useCallback((item: VocabularyItem) => {
    setItems((current) =>
      current.map((existing) =>
        existing.id === item.id ? item : existing,
      ),
    );
  }, []);

  const value = useMemo<VocabularyContextType>(
    () => ({
      items,
      setItems,
      learningLanguage,
      loading,
      error,
      setError,
      refresh,
      addItem,
      removeItem,
      updateItem,
    }),
    [
      items,
      learningLanguage,
      loading,
      error,
      refresh,
      addItem,
      removeItem,
      updateItem,
    ],
  );

  return (
    <VocabularyContext.Provider value={value}>
      {children}
    </VocabularyContext.Provider>
  );
}

export function useVocabulary() {
  const context = useContext(VocabularyContext);

  if (!context) {
    throw new Error(
      "useVocabulary must be used inside VocabularyProvider.",
    );
  }

  return context;
}
