import { APP_ORIGIN } from "@/lib/auth/canonicalOrigin";

/* =========================================================
   Where a hello lives

   /a-word-to-invite-you/<id> (Chi's wording, 2026-10-19: a link that says
   what it is reads as an invitation, not as a scam), always on the app's
   one real domain — from a preview build or a development machine too.
   Those share the live database, so a hello made there is real and opens
   at the real address once the code serving it is live; a long deployment
   address is never what a friend receives. `test` only says the hello was
   made somewhere that is not the live site, so the screen can say why its
   link may not open yet.

   The first links said /hello/<id>; those redirect here (app/hello), and
   a scanned code in either shape opens the hello.

   The id is twelve characters from a 64-letter alphabet — 72 bits —
   which is what "anyone holding the link can see it" rests on: it cannot
   be guessed, counted or walked.
   ========================================================= */

export const HELLO_ID_PATTERN = /^[A-Za-z0-9_-]{12}$/;

export function isHelloId(value: unknown): value is string {
  return typeof value === "string" && HELLO_ID_PATTERN.test(value);
}

export const HELLO_SEGMENT = "a-word-to-invite-you";

export function helloPath(id: string): string {
  return `/${HELLO_SEGMENT}/${encodeURIComponent(id)}`;
}

/** Signing in from a hello, and back (app/a-word-to-invite-you/[id]/join). */
export function helloJoinPath(id: string): string {
  return `${helloPath(id)}/join`;
}

/** Whether `origin` is the live site, as opposed to a test of it. */
export function isLiveOrigin(origin: string): boolean {
  try {
    return new URL(origin).origin === APP_ORIGIN;
  } catch {
    return false;
  }
}

/**
 * The link a hello is shared with: always the live site's address.
 * `test` is true when it was made anywhere else, where the screen says the
 * link opens once this version is live.
 */
export function helloShareUrl(id: string, currentOrigin: string): { url: string; test: boolean } {
  return { url: `${APP_ORIGIN}${helloPath(id)}`, test: !isLiveOrigin(currentOrigin) };
}

/**
 * The hello id in whatever a QR code decoded to, or "" if it is not one.
 *
 * Only http(s), only an /a-word-to-invite-you/<id> or older /hello/<id>
 * path, only an id of the exact shape: a code from somewhere else is "not
 * ours", which the scanner tells apart from "ours, unreadable". The host is
 * not checked, so a code scanned on a test build opens there; the id alone
 * decides what opens, and it opens in this app, never at the scanned host.
 */
export function helloIdFromUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return "";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "";
  const match = url.pathname.match(/^\/(?:a-word-to-invite-you|hello)\/([^/]+)\/?$/);
  if (!match) return "";
  const id = decodeURIComponent(match[1]);
  return isHelloId(id) ? id : "";
}
