import type { SharedWordCard } from "@/lib/messages/wordCard";

const STORAGE_KEY = "pending-shared-vocabulary";

// Kept as SharedWordCard (word/translation/partOfSpeech/englishExample/
// chineseExample) rather than the full VocabularyItem shape it used to be
// typed as — that's the exact, and only, shape any consumer of this queue
// (ConversationThread.tsx's word-card-on-open effect) actually needs, and
// it lets any "share a word" entry point (Vocabulary, Discover's camera
// identify, ...) write into the same queue without pretending to have a
// full vocabulary row (id, user_id, status, etc.) it doesn't have.
export function setPendingSharedVocabulary(card: SharedWordCard): boolean {
  if (typeof window === "undefined") return false;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(card));

    return true;
  } catch (storageError) {
    console.error("Could not store pending vocabulary:", storageError);

    return false;
  }
}

export function getPendingSharedVocabulary(): SharedWordCard | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);

    if (!raw) return null;

    return JSON.parse(raw) as SharedWordCard;
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