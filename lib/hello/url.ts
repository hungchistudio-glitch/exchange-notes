import { APP_ORIGIN } from "@/lib/auth/canonicalOrigin";

/* =========================================================
   Where a hello lives

   /hello/<id>, on the app's one real domain. A hello made on the live site
   always says so, whatever address the sharer happened to open the app
   from; a hello made on a development machine or a preview build points
   back there, and is marked as a test link, so a random deployment
   address is never handed out as the real one.

   The id is twelve characters from a 64-letter alphabet — 72 bits —
   which is what "anyone holding the link can see it" rests on: it cannot
   be guessed, counted or walked.
   ========================================================= */

export const HELLO_ID_PATTERN = /^[A-Za-z0-9_-]{12}$/;

export function isHelloId(value: unknown): value is string {
  return typeof value === "string" && HELLO_ID_PATTERN.test(value);
}

export function helloPath(id: string): string {
  return `/hello/${encodeURIComponent(id)}`;
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
 * The link a hello is shared with.
 *
 * Built from the canonical origin on the live site. Elsewhere — localhost,
 * a Vercel preview — from the origin it was made on, because that is the
 * only database it exists in; `test` says so, and the screen shows it.
 */
export function helloShareUrl(id: string, currentOrigin: string): { url: string; test: boolean } {
  const live = isLiveOrigin(currentOrigin);
  const origin = live ? APP_ORIGIN : currentOrigin.replace(/\/$/, "");
  return { url: `${origin}${helloPath(id)}`, test: !live };
}

/**
 * The hello id in whatever a QR code decoded to, or "" if it is not one.
 *
 * Only http(s), only a /hello/<id> path, only an id of the exact shape: a
 * code from somewhere else is "not ours", which the scanner tells apart
 * from "ours, unreadable". The host is not checked, so a test link scanned
 * on its own test build still works; the id alone decides what opens.
 */
export function helloIdFromUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return "";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "";
  const match = url.pathname.match(/^\/hello\/([^/]+)\/?$/);
  if (!match) return "";
  const id = decodeURIComponent(match[1]);
  return isHelloId(id) ? id : "";
}
