import { NextResponse, type NextRequest } from "next/server";

import {
  friendInvitePath,
  PENDING_FRIEND_INVITE_COOKIE,
  PENDING_FRIEND_INVITE_MAX_AGE_SECONDS,
} from "@/lib/friends";
import { createClient } from "@/lib/supabase/server";
import { normalizeExchangeId } from "@/lib/utils";

/**
 * Where a scanned friend QR code lands.
 *
 * /friends is behind the protected layout, which redirects a signed-out
 * visitor to /login and forgets why they came — so scanning a friend's code
 * while logged out used to cost you the invite. A route handler is the only
 * place in the app that can both read the session and write a cookie, so the
 * Exchange ID is parked here and picked back up by /auth/callback once Google
 * hands the session over.
 *
 * The redirect target is never taken from the request. It is always a fixed
 * in-app path built from an Exchange ID that normalizeExchangeId has reduced
 * to at most 24 characters of [a-z0-9_], so there is no open redirect to find
 * here even with a hand-written /invite URL.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ exchangeId: string }> },
) {
  const { exchangeId } = await params;
  const clean = normalizeExchangeId(decodeURIComponent(exchangeId));

  if (!clean) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return NextResponse.redirect(
      new URL(friendInvitePath(clean), request.url),
    );
  }

  const response = NextResponse.redirect(new URL("/login", request.url));

  response.cookies.set(PENDING_FRIEND_INVITE_COOKIE, clean, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: PENDING_FRIEND_INVITE_MAX_AGE_SECONDS,
  });

  return response;
}
