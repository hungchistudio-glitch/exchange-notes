import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { track } from "@/lib/analytics/track";
import { redirectAfterSignIn } from "@/lib/auth/afterSignIn";
import { LOGIN_ERROR_PARAM } from "@/lib/auth/googleRedirect";

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

    /*
     * Straight back to the login page, saying so. This used to carry on to
     * /home regardless, whose auth check bounced the reader to /login with
     * nothing on it to say the attempt had failed — a second sign-in that
     * looked like the first one had simply been ignored.
     */
    if (error) {
      console.error(`[auth] Code exchange failed: ${error.message}`);

      const login = new URL("/login", request.url);
      login.searchParams.set(LOGIN_ERROR_PARAM, "google");

      return NextResponse.redirect(login);
    }

    track("google_auth_success");
  }

  return redirectAfterSignIn(cookieStore, request.url);
}
