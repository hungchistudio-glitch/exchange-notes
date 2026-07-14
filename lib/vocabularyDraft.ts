import type { VocabularyItem } from "@/lib/types/app";

const STORAGE_KEY = "pending-shared-vocabulary";

export function setPendingSharedVocabulary(item: VocabularyItem) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(item));
  } catch {
    // Storage can fail (private mode, quota). Safe to ignore.
  }
}

export function consumePendingSharedVocabulary(): VocabularyItem | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    window.sessionStorage.removeItem(STORAGE_KEY);
    return JSON.parse(raw) as VocabularyItem;
  } catch {
    return null;
  }
}
