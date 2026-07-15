import type { VocabularyItem } from "@/lib/types/app";

const STORAGE_KEY = "pending-shared-vocabulary";

export function setPendingSharedVocabulary(item: VocabularyItem): boolean {
  if (typeof window === "undefined") return false;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(item));

    return true;
  } catch (storageError) {
    console.error("Could not store pending vocabulary:", storageError);

    return false;
  }
}

export function consumePendingSharedVocabulary(): VocabularyItem | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);

    if (!raw) return null;

    window.sessionStorage.removeItem(STORAGE_KEY);

    return JSON.parse(raw) as VocabularyItem;
  } catch (storageError) {
    console.error("Could not consume pending vocabulary:", storageError);

    return null;
  }
}
