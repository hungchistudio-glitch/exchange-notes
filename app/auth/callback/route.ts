import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  friendInvitePath,
  PENDING_FRIEND_INVITE_COOKIE,
} from "@/lib/friends";
import { track } from "@/lib/analytics/track";
import { normalizeExchangeId } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  const cookieStore = await cookies();

  if (code) {

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      track("google_auth_success");
    }
  }

  /*
   * /invite parks a scanned Exchange ID here when the visitor turned out to be
   * signed out, so a QR code scanned from the lock screen still ends where it
   * was pointing instead of dumping them on the home page.
   *
   * Re-normalized rather than trusted: the cookie is httpOnly, but the value
   * goes into a redirect, and "the last hop wrote it" is not a reason to skip
   * checking. Anything that does not survive normalization sends them home.
   */
  const pendingCookie = cookieStore.get(PENDING_FRIEND_INVITE_COOKIE);
  const pendingInvite = normalizeExchangeId(pendingCookie?.value ?? "");

  const destination = pendingInvite
    ? friendInvitePath(pendingInvite)
    : "/home";

  const response = NextResponse.redirect(
    new URL(destination, request.url),
  );

  // Cleared whenever it was set, not only when it was usable, so a value that
  // fails normalization cannot sit around redirecting later sign-ins.
  if (pendingCookie) {
    response.cookies.delete(PENDING_FRIEND_INVITE_COOKIE);
  }

  return response;
}
