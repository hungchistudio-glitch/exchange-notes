import { reloadHeld } from "@/lib/pwa/reloadHolds";

/* =========================================================
   Coming back to a newer app (Chi, 2026-10-01: "回到 App 時自動重整")

   An installed app resumed from the background keeps running the code it
   started with. Next's router does fetch a new build on the next page
   change — but a reader who stays on one screen, which on a phone is most
   of the time, could sit on a days-old build, and the service worker's
   "update ready" banner never fires because sw.js itself never changes.

   So: when the app comes back to the foreground after a while away, ask the
   server which build it is serving, and if that is not the build on screen,
   reload — unless the reader is in the middle of something a reload would
   throw away: typing, a camera, a recording, a menu being read. Then the
   update waits for the next time they come back (or for the next page
   change, which reloads on its own).
   ========================================================= */

/** How long the app must have been away before coming back checks. */
export const MIN_AWAY_MS = 30_000;

const RELOADED_FOR_KEY = "exchange-notes:reloaded-for";

/* ---------- typing ---------- */

const TEXT_INPUT_TYPES = new Set(["", "text", "search", "email", "url", "tel"]);

function isTextField(element: Element): element is HTMLInputElement | HTMLTextAreaElement {
  if (element instanceof HTMLTextAreaElement) return true;
  return (
    element instanceof HTMLInputElement &&
    TEXT_INPUT_TYPES.has(element.getAttribute("type")?.toLowerCase() ?? "")
  );
}

/**
 * Whether the reader is typing, or has typed something not yet sent.
 *
 * A focused field counts even when empty (the keyboard is up, a word is on
 * its way). Any other field with text in it counts too: React keeps an
 * input's `defaultValue` in step with its value, so "changed since it was
 * drawn" cannot be told apart from "filled in by the page", and keeping a
 * screen with a pre-filled field on the old build a little longer costs
 * nothing a lost draft would.
 */
export function hasUnsentText(doc: Document = document): boolean {
  const active = doc.activeElement;
  if (active instanceof HTMLElement) {
    if (isTextField(active) && !active.readOnly && !active.disabled) return true;
    if (active.isContentEditable) return true;
  }

  for (const field of doc.querySelectorAll("input, textarea")) {
    if (!isTextField(field) || field.readOnly || field.disabled) continue;
    if (field.value.trim()) return true;
  }

  for (const element of doc.querySelectorAll<HTMLElement>("[contenteditable]")) {
    if (element.getAttribute("contenteditable") === "false") continue;
    if (element.textContent?.trim()) return true;
  }

  return false;
}

/* ---------- deciding ---------- */

export type UpdateDecision =
  | "reload"
  /** Same build, or nothing to compare. */
  | "current"
  /** Newer build, but the reader is busy; try again next time. */
  | "wait"
  /** Already reloaded for this build once and it is still not here. */
  | "gave_up";

export function decideUpdate({
  running,
  served,
  reloadedFor,
  busy,
}: {
  running: string;
  served: string | null;
  reloadedFor: string | null;
  busy: boolean;
}): UpdateDecision {
  if (!running || !served || served === running) return "current";
  // A reload that did not bring the new build would bring the same answer
  // every time the app came back: reload once per build, never in a loop.
  if (reloadedFor === served) return "gave_up";
  return busy ? "wait" : "reload";
}

/* ---------- asking ---------- */

export async function fetchServedVersion(
  fetcher: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const response = await fetcher("/api/version", {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { version?: unknown };
    return typeof body.version === "string" && body.version ? body.version : null;
  } catch {
    return null;
  }
}

function readReloadedFor(): string | null {
  try {
    return window.sessionStorage.getItem(RELOADED_FOR_KEY);
  } catch {
    return null;
  }
}

function rememberReloadFor(version: string) {
  try {
    window.sessionStorage.setItem(RELOADED_FOR_KEY, version);
  } catch {
    // Without storage the guard is gone, but a reload still only happens on
    // coming back after MIN_AWAY_MS, so a loop could never be a tight one.
  }
}

/**
 * Asks the server which build it serves and reloads onto it if the reader
 * is not busy. Returns what it decided, for the watcher and the tests.
 */
export async function checkForUpdate({
  running,
  fetcher,
  reload = () => window.location.reload(),
}: {
  running: string;
  fetcher?: typeof fetch;
  reload?: () => void;
}): Promise<UpdateDecision> {
  const served = await fetchServedVersion(fetcher);

  const decision = decideUpdate({
    running,
    served,
    reloadedFor: readReloadedFor(),
    // Read after the request, not before: the reader may have started
    // typing while it was on its way.
    busy: reloadHeld() || hasUnsentText(),
  });

  if (decision === "reload" && served) {
    rememberReloadFor(served);
    reload();
  }

  return decision;
}
