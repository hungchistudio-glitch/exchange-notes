import type { DailyNewsCard } from "@/lib/types/dailyNews";

const PENDING_ARTICLE_KEY = "news-article-pending";

/**
 * Stashes the full article in sessionStorage so it can be picked up
 * on the Messages page after the user is redirected there to pick a
 * partner. sessionStorage (not localStorage) because this is a
 * transient handoff, not something that should persist across tabs
 * or days.
 */
export function setPendingSharedArticle(card: DailyNewsCard): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(PENDING_ARTICLE_KEY, JSON.stringify(card));
  } catch {
    // Storage can fail (private mode, quota). Safe to ignore —
    // the user can still share the article link manually.
  }
}

/**
 * Reads and clears the pending article in one step, so it's only
 * ever consumed once.
 */
export function consumePendingSharedArticle(): DailyNewsCard | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(PENDING_ARTICLE_KEY);
    if (!raw) return null;

    window.sessionStorage.removeItem(PENDING_ARTICLE_KEY);
    return JSON.parse(raw) as DailyNewsCard;
  } catch {
    return null;
  }
}
