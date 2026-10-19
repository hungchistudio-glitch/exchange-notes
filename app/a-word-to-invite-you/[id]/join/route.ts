import { NextResponse, type NextRequest } from "next/server";

import { PENDING_HELLO_COOKIE, PENDING_HELLO_MAX_AGE_SECONDS } from "@/lib/hello/pending";
import { helloPath, isHelloId } from "@/lib/hello/url";
import { createClient } from "@/lib/supabase/server";

/**
 * "Make your own Yumi" and "Meet …" on a hello, for a visitor not yet
 * signed in.
 *
 * Parks the hello's id for the trip through sign-in, then sends them to
 * /login; lib/auth/afterSignIn.ts brings them back to the hello, signed in,
 * where the friend button is theirs to press. Nothing is sent on the way:
 * not a friend request, not a saved word.
 *
 * A day rather than the friend invite's fifteen minutes, because signing
 * up is longer than signing in. And the destination is never taken from
 * the request: it is always the hello's own path, for an id of the exact
 * shape, so there is no open redirect here.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isHelloId(id)) return NextResponse.redirect(new URL("/", request.url));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) return NextResponse.redirect(new URL(helloPath(id), request.url));

  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set(PENDING_HELLO_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: PENDING_HELLO_MAX_AGE_SECONDS,
  });
  return response;
}
