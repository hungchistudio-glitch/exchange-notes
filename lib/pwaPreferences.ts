/* =========================================================
   PWA install prompt preferences
   ========================================================= */

const DISMISSED_AT_KEY = "exchange-notes-pwa-install-dismissed-at";
const INSTALLED_KEY = "exchange-notes-pwa-installed";
const SNOOZE_DAYS = 7;

export function getInstallPromptDismissedAt(): number | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(DISMISSED_AT_KEY);
  const parsed = raw ? Number(raw) : NaN;

  return Number.isFinite(parsed) ? parsed : null;
}

export function recordInstallPromptDismissed() {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
}

// Don't nag every session: once someone taps "Maybe later", stay quiet for
// a week before offering again.
export function shouldOfferInstallPrompt(): boolean {
  const dismissedAt = getInstallPromptDismissedAt();
  if (dismissedAt === null) return true;

  const elapsedDays = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
  return elapsedDays >= SNOOZE_DAYS;
}

// display-mode/navigator.standalone detection only tells us the CURRENT
// window's mode — a user who installed and is now looking at the app from
// a still-open browser tab would otherwise see the prompt again. This
// remembers that "appinstalled" already fired once, independent of how
// this particular window was opened.
export function markAppInstalled() {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(INSTALLED_KEY, "true");
}

export function getRememberedInstalled(): boolean {
  if (typeof window === "undefined") return false;

  return window.localStorage.getItem(INSTALLED_KEY) === "true";
}
