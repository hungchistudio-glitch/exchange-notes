"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  isVocabularyViewMode,
  VOCABULARY_VIEW_STORAGE_KEY,
  type VocabularyViewMode,
} from "@/lib/vocabulary/viewMode";

const VIEW_MODE_EVENT = "exchange-notes:vocabulary-view-mode";

function getSnapshot(): VocabularyViewMode {
  if (typeof window === "undefined") return "cards";

  const stored = window.localStorage.getItem(VOCABULARY_VIEW_STORAGE_KEY);
  return isVocabularyViewMode(stored) ? stored : "cards";
}

function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(VIEW_MODE_EVENT, listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(VIEW_MODE_EVENT, listener);
  };
}

function getServerSnapshot(): VocabularyViewMode {
  return "cards";
}

export default function useVocabularyViewMode() {
  const viewMode = useSyncExternalStore<VocabularyViewMode>(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setViewMode = useCallback((nextMode: VocabularyViewMode) => {
    window.localStorage.setItem(VOCABULARY_VIEW_STORAGE_KEY, nextMode);
    window.dispatchEvent(new Event(VIEW_MODE_EVENT));
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode(getSnapshot() === "cards" ? "compact" : "cards");
  }, [setViewMode]);

  return { viewMode, setViewMode, toggleViewMode };
}
