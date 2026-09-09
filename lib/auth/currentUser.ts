import "server-only";

import { redirect } from "next/navigation";
import {
  isAuthApiError,
  isAuthRetryableFetchError,
  isAuthSessionMissingError,
  type AuthError,
  type User,
} from "@supabase/supabase-js";

import type { createClient } from "@/lib/supabase/server";

/* =========================================================
   "Not signed in" and "could not find out" are different answers

   Four places asked `supabase.auth.getUser()` and read only `data.user`,
   dropping `error`. Every one of them then treated a null user as proof that
   nobody was signed in — the protected layout and two pages by sending the
   reader to /login, the public landing page by not sending them to /home.

   getUser() reaches the auth server on every call, and it fails for reasons
   that have nothing to do with the reader: a dropped connection, a slow cold
   start, a rate limit, an auth server having a bad minute. All of those looked
   exactly like signing out.

   That is the wrong way round. Being told "we could not check" and responding
   "then you are a stranger" turns a blip into a sign-out screen, and a reader
   who obliges by signing in again pays for it — as the session-refresh bug
   showed, an unnecessary round through the OAuth flow is not free.

   So the answer has three shapes rather than two, and the caller has to say
   what it wants for each.
   ========================================================= */

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Thrown when the auth server could not be reached. See requireUser. */
export class AuthUnavailableError extends Error {
  constructor(cause: AuthError) {
    super("The sign-in service could not be reached.");
    this.name = "AuthUnavailableError";
    this.cause = cause;
  }
}

export type CurrentUser =
  | { state: "signed-in"; user: User }
  | { state: "signed-out" }
  | { state: "unavailable"; error: AuthError };

/**
 * Who is signed in, or why that could not be established.
 *
 * `signed-out` is reserved for answers that actually mean it: no session at
 * all, or an auth server that looked and said no. Anything else — including
 * anything unrecognised — is `unavailable`, because the cost of guessing wrong
 * is asymmetric. Calling a stranger unavailable delays a redirect by one
 * reload; calling a signed-in reader a stranger throws them out of the app.
 */
export async function readCurrentUser(
  supabase: Supabase,
): Promise<CurrentUser> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error) {
    return user ? { state: "signed-in", user } : { state: "signed-out" };
  }

  /* There was no session to check. Nothing ambiguous about it. */
  if (isAuthSessionMissingError(error)) return { state: "signed-out" };

  /* Never reached the auth server: no connection, or it timed out. */
  if (isAuthRetryableFetchError(error)) return { state: "unavailable", error };

  if (isAuthApiError(error)) {
    /*
     * The auth server answered. A 4xx is its verdict on this session and is
     * final — an expired token, a rotated refresh token it no longer knows, a
     * deleted account. Two exceptions, and both are about the server rather
     * than the reader: 429 means it declined to look, and 5xx means it tried
     * and broke.
     */
    return error.status === 429 || error.status >= 500
      ? { state: "unavailable", error }
      : { state: "signed-out" };
  }

  return { state: "unavailable", error };
}

/**
 * The signed-in reader, or an exit.
 *
 * For the routes that cannot render without one. A reader who is genuinely
 * signed out goes to /login, exactly as before. A failure to check throws
 * instead, which app/error.tsx turns into a screen offering another go — the
 * session is untouched by any of this, so the reload usually just works.
 *
 * Shared rather than repeated at each call site: three routes make this same
 * decision, and three copies of it is three places for it to drift.
 */
export async function requireUser(supabase: Supabase): Promise<User> {
  const current = await readCurrentUser(supabase);

  if (current.state === "signed-in") return current.user;

  if (current.state === "unavailable") {
    throw new AuthUnavailableError(current.error);
  }

  redirect("/login");
}
