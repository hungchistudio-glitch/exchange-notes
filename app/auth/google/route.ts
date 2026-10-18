import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { track } from "@/lib/analytics/track";
import { redirectAfterSignIn } from "@/lib/auth/afterSignIn";
import {
  GOOGLE_LOGIN_PATH,
  GOOGLE_NONCE_COOKIE,
  LOGIN_ERROR_PARAM,
} from "@/lib/auth/googleRedirect";
import { createClient } from "@/lib/supabase/server";

/* =========================================================
   Where Google's redirect mode lands

   The installed app's sign-in (see lib/auth/googleRedirect.ts). Google posts
   the signed ID token here as a form, this hands it to Supabase exactly as
   the popup flow does from the browser, and the session cookies Supabase
   writes ride back on the redirect home.

   Two checks before Supabase is asked anything:

   - Google's double-submit token. The GIS library writes `g_csrf_token` as a
     cookie and posts the same value in the body; a request whose two copies
     differ did not come from this browser's sign-in, and is refused.

     The cookie lasts five minutes from the tap, which a reader confirming a
     new phone with Google can outlast. A missing cookie is therefore not a
     refusal on its own; the nonce below already binds the token to this
     browser, and refusing a reader for being slow would be the "sign in
     twice" bug again, by another route.

   - The nonce cookie, which must exist. Supabase compares its hash with the
     one Google signed into the token, so an ID token minted for any other
     attempt — anyone else's, or this reader's from another device — fails.

   Every failure goes back to the login page with a flag that puts the usual
   "could not sign in" line under the button. The reason goes to the logs
   only, because it names infrastructure.
   ========================================================= */

type GooglePost = {
  credential: string;
  csrfToken: string;
};

/**
 * The two fields this route reads, from either body Google might send.
 *
 * A form is what the GIS library actually submits. Google's server-side
 * guide illustrates the same fields as JSON, so that is accepted too rather
 * than finding out which one a future library version prefers by having
 * sign-in stop working.
 */
async function readGooglePost(request: NextRequest): Promise<GooglePost> {
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as Record<string, unknown>;

      return {
        credential: typeof body.credential === "string" ? body.credential : "",
        csrfToken:
          typeof body.g_csrf_token === "string" ? body.g_csrf_token : "",
      };
    }

    const form = await request.formData();
    const credential = form.get("credential");
    const csrfToken = form.get("g_csrf_token");

    return {
      credential: typeof credential === "string" ? credential : "",
      csrfToken: typeof csrfToken === "string" ? csrfToken : "",
    };
  } catch {
    return { credential: "", csrfToken: "" };
  }
}

function backToLogin(request: NextRequest, reason: string): NextResponse {
  console.error(`[auth] Google redirect sign-in refused: ${reason}`);

  const url = new URL("/login", request.url);
  url.searchParams.set(LOGIN_ERROR_PARAM, "google");

  const response = NextResponse.redirect(url, 303);
  response.cookies.delete({ name: GOOGLE_NONCE_COOKIE, path: GOOGLE_LOGIN_PATH });

  return response;
}

export async function POST(request: NextRequest) {
  const { credential, csrfToken } = await readGooglePost(request);
  const cookieStore = await cookies();

  if (!credential) return backToLogin(request, "no credential in the post");

  const csrfCookie = cookieStore.get("g_csrf_token")?.value;

  if (!csrfToken) return backToLogin(request, "no g_csrf_token in the post");

  if (csrfCookie && csrfCookie !== csrfToken) {
    return backToLogin(request, "g_csrf_token mismatch");
  }

  const nonceCookie = cookieStore.get(GOOGLE_NONCE_COOKIE)?.value;
  const nonce = nonceCookie ? decodeURIComponent(nonceCookie) : "";

  if (!nonce) return backToLogin(request, "no nonce cookie");

  const supabase = await createClient();

  /*
   * The raw nonce, as in the popup flow: Supabase hashes it and compares the
   * result with the hash Google signed into the token. Its session cookies
   * are written through the cookie store, which in a route handler is
   * merged into whatever response this returns.
   */
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: credential,
    nonce,
  });

  if (error) return backToLogin(request, error.message);

  track("google_auth_success");

  const response = redirectAfterSignIn(cookieStore, request.url, 303);

  // Single use: the token it was bound to has just been spent.
  response.cookies.delete({ name: GOOGLE_NONCE_COOKIE, path: GOOGLE_LOGIN_PATH });

  return response;
}

/*
 * Nothing should arrive here by GET. A reader who does — a stale tab, the back
 * button after Google — is simply sent to sign in.
 */
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
