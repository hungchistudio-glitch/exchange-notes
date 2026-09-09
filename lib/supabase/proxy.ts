import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps the Supabase session cookies fresh for server rendering.
 *
 * lib/supabase/server.ts cannot do this itself — its setAll is a no-op,
 * because a Server Component is not allowed to set cookies, and its comment
 * has always said middleware would handle it. Nothing did. So a rotated access
 * token was only ever written back by supabase-js in the browser, and a
 * server-rendered navigation read whatever cookie the browser happened to be
 * holding.
 *
 * This does the refresh and nothing else. It deliberately does not redirect:
 * app/(protected)/layout.tsx already decides who may see what, and a second
 * gate here would be a second place to keep that decision correct.
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  /*
   * Pass the request through rather than throwing. This runs ahead of every
   * page, so a missing variable here would turn a configuration problem into a
   * blank 500 on the whole site; letting it reach the real auth check surfaces
   * the same problem where it can be read.
   */
  if (!supabaseUrl || !supabasePublishableKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        /*
         * Both halves matter. The request copy is what the page being rendered
         * on this same pass will read; the response copy is what the browser
         * stores for the next one. Writing only the response would leave this
         * render reading the stale token it just replaced.
         */
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  /*
   * getClaims with no argument calls getSession first, and getSession is what
   * rotates an expired token — the write lands in setAll above. Preferred over
   * getUser because once the session is valid it verifies the JWT locally
   * against the signing key, instead of spending a round trip to the auth
   * server on every request that passes through here.
   *
   * The result is not read. An invalid or absent session is not this
   * function's business; it just means there was nothing to refresh.
   */
  await supabase.auth.getClaims();

  return response;
}
