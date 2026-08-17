/*
 * What /messages looked like when you left it.
 *
 * Under the two-page architecture, opening a conversation is a real
 * navigation rather than a swap inside one shell, so coming back re-mounts
 * the list from nothing. Without this the tab resets to Recent, the search
 * box empties and a list scrolled halfway down snaps to the top — which is
 * precisely the cost a split-pane layout used to avoid paying, and the one
 * thing that would make the new structure feel worse than the old one.
 *
 * sessionStorage rather than a module-level variable: a hard reload inside a
 * conversation, or arriving from a push notification and pressing back,
 * should still land somewhere recognisable. It is per-tab and cleared when
 * the tab closes, which is the right lifetime for "where I was just now".
 */

const STORAGE_KEY = "exchange-notes-messages-hub";

export type MessagesHubTab = "recent" | "friends" | "requests";

export type MessagesHubState = {
  tab: MessagesHubTab;
  query: string;
  scrollTop: number;
};

export const DEFAULT_HUB_STATE: MessagesHubState = {
  tab: "recent",
  query: "",
  scrollTop: 0,
};

function isTab(value: unknown): value is MessagesHubTab {
  return value === "recent" || value === "friends" || value === "requests";
}

export function readHubState(): MessagesHubState {
  if (typeof window === "undefined") return DEFAULT_HUB_STATE;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HUB_STATE;

    const parsed = JSON.parse(raw) as Partial<MessagesHubState>;

    return {
      tab: isTab(parsed.tab) ? parsed.tab : DEFAULT_HUB_STATE.tab,
      query: typeof parsed.query === "string" ? parsed.query : "",
      scrollTop:
        typeof parsed.scrollTop === "number" && Number.isFinite(parsed.scrollTop)
          ? Math.max(0, parsed.scrollTop)
          : 0,
    };
  } catch {
    // A malformed or unavailable store is not worth failing a page render
    // over — the list simply opens at the top, the way it used to.
    return DEFAULT_HUB_STATE;
  }
}

export function writeHubState(state: MessagesHubState): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private-mode quota failures are silent: losing the restore point is a
    // smaller problem than throwing out of an event handler.
  }
}
