import "server-only";

import { NextResponse } from "next/server";

import {
  friendInvitePath,
  PENDING_FRIEND_INVITE_COOKIE,
} from "@/lib/friends";
import { PENDING_HELLO_COOKIE } from "@/lib/hello/pending";
import { helloPath, isHelloId } from "@/lib/hello/url";
import { normalizeExchangeId } from "@/lib/utils";

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

/**
 * The redirect that ends every sign-in, whichever way it came in.
 *
 * Shared by /auth/callback (the Supabase redirect flow, and the popup flow
 * on its way through) and /auth/google (Google's redirect mode), so the two
 * cannot disagree about where a newly signed-in reader lands.
 *
 * /invite parks a scanned Exchange ID in a cookie when the visitor turned out
 * to be signed out, so a QR code scanned from the lock screen still ends
 * where it was pointing instead of dumping them on the home page.
 *
 * Re-normalized rather than trusted: the cookie is httpOnly, but the value
 * goes into a redirect, and "the last hop wrote it" is not a reason to skip
 * checking. Anything that does not survive normalization sends them home.
 *
 * `status` is 303 after a POST, so the browser follows with a GET.
 */
export function redirectAfterSignIn(
  cookieStore: CookieReader,
  requestUrl: string,
  status: 303 | 307 = 307,
): NextResponse {
  const pendingCookie = cookieStore.get(PENDING_FRIEND_INVITE_COOKIE);
  const pendingInvite = normalizeExchangeId(pendingCookie?.value ?? "");
  /* A Yumi hello the visitor left to sign in (app/hello/[id]/join): back to
     it, where anything further is theirs to press. Checked for its exact
     shape, like the invite, before it goes into a redirect. */
  const helloCookie = cookieStore.get(PENDING_HELLO_COOKIE);
  const pendingHello = isHelloId(helloCookie?.value) ? helloCookie.value : null;

  const destination = pendingHello
    ? helloPath(pendingHello)
    : pendingInvite
      ? friendInvitePath(pendingInvite)
      : "/home";

  const response = NextResponse.redirect(
    new URL(destination, requestUrl),
    status,
  );

  // Cleared whenever it was set, not only when it was usable, so a value that
  // fails normalization cannot sit around redirecting later sign-ins.
  if (pendingCookie) {
    response.cookies.delete(PENDING_FRIEND_INVITE_COOKIE);
  }
  if (helloCookie) {
    response.cookies.delete(PENDING_HELLO_COOKIE);
  }

  return response;
}
