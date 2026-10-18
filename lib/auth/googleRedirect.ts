/* =========================================================
   Signing in from the Home Screen app, without a popup

   The Google button signs in through a popup everywhere else: Google opens
   a window, the reader picks an account, and the window hands the signed ID
   token back to this page. In an iOS Home Screen web app that window opens
   in a separate in-app browser, and the hand-back does not reliably arrive.
   The reader picks their account, lands back on the login page, and nothing
   has happened (Chi, 2026-10-18: "選完帳號回登入頁"). Supabase never heard
   about the first attempt, and the second one usually worked, which is the
   "sometimes I have to sign in twice" report.

   So an installed app uses Google's redirect mode instead. The app's own
   window goes to Google and comes back: Google POSTs the ID token to
   /auth/google, which signs in on the server and redirects home. Nothing
   relies on one window talking to another.

   The popup stays for an ordinary browser tab, where it works and where
   leaving the page would be the worse experience.

   ── The nonce has to survive the trip ──────────────────────────────────

   In popup mode the raw nonce stays in memory, because the same page that
   asked Google is the one that hears back. In redirect mode the page is
   gone by then, so the raw value rides in a cookie to the route that does
   the signing in. It is not a secret from this page; what it guards against
   is an ID token minted for somebody else's attempt being replayed into this
   one, and only this browser holds the value its token was bound to. That
   is also what makes the route safe from login CSRF: a token posted from
   anywhere else carries a nonce this browser never asked for.

   SameSite=None because Google's POST is a cross-site request, and Lax
   cookies are not sent on one. Scoped to the one path that reads it.
   ========================================================= */

/**
 * The Google Identity Services script.
 *
 * Here rather than in lib/auth/googleIdentity.ts, which is a client module:
 * the login page's server component preloads this URL, and a server component
 * importing a value from a "use client" file gets a client reference, not the
 * string.
 */
export const GOOGLE_IDENTITY_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

/** Where Google posts the ID token in redirect mode. */
export const GOOGLE_LOGIN_PATH = "/auth/google";

/** The raw nonce for a redirect-mode attempt, read by GOOGLE_LOGIN_PATH. */
export const GOOGLE_NONCE_COOKIE = "exchange-notes-google-nonce";

/**
 * How long the nonce cookie lasts.
 *
 * A day rather than minutes, because an installed app can sit on the login
 * screen overnight with the button already armed for this nonce, and a
 * cookie that had expired by the morning would turn the first tap into a
 * failed sign-in. The value is single-use: the route deletes it on every
 * attempt, and every visit to the login page writes a new one.
 */
export const GOOGLE_NONCE_MAX_AGE_SECONDS = 24 * 60 * 60;

/** The query the login page reads to say that the last attempt failed. */
export const LOGIN_ERROR_PARAM = "error";

/**
 * Whether this page is running as an installed app rather than in a tab.
 *
 * `navigator.standalone` is the iOS signal and is true only for a Home
 * Screen web app; the media query covers installed apps elsewhere. Either is
 * enough: an installed app should never depend on a popup.
 */
export function isInstalledApp(): boolean {
  if (typeof window === "undefined") return false;

  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true;

  const displayStandalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;

  return iosStandalone || displayStandalone;
}

/** Stores the raw nonce for GOOGLE_LOGIN_PATH to read after Google's POST. */
export function rememberRedirectNonce(raw: string) {
  /*
   * Secure is required with SameSite=None. Browsers treat http://localhost
   * as a secure context and accept it there, so development needs no branch.
   */
  document.cookie = [
    `${GOOGLE_NONCE_COOKIE}=${encodeURIComponent(raw)}`,
    `Path=${GOOGLE_LOGIN_PATH}`,
    `Max-Age=${GOOGLE_NONCE_MAX_AGE_SECONDS}`,
    "SameSite=None",
    "Secure",
  ].join("; ");
}
