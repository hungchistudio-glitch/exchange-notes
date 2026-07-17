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

export function getPendingSharedVocabulary(): VocabularyItem | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);

    if (!raw) return null;

    return JSON.parse(raw) as VocabularyItem;
  } catch (storageError) {
    console.error("Could not read pending vocabulary:", storageError);

    return null;
  }
}

export function clearPendingSharedVocabulary() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch (storageError) {
    console.error("Could not clear pending vocabulary:", storageError);
  }
}

/**
 * Kept for compatibility with older code.
 */
export function consumePendingSharedVocabulary(): VocabularyItem | null {
  const item = getPendingSharedVocabulary();

  if (item) {
    clearPendingSharedVocabulary();
  }

  return item;
}
