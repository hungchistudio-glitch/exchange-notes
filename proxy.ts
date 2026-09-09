import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/*
 * Next 16 renamed the middleware convention to proxy; the file has to sit at
 * the project root beside app/ to be picked up.
 *
 * Its only job is rotating the Supabase session cookies so a server-rendered
 * navigation does not read an expired token. Authorization stays where it
 * already lives, in app/(protected)/layout.tsx.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  /*
   * Without a matcher this runs on every request, static assets included, so
   * the pattern is a negative one. Excluded:
   *
   * - api      Route Handlers can write cookies themselves, and the Scriptable
   *            endpoints authenticate with a bearer token rather than a
   *            session, so there is nothing here for them to refresh.
   * - auth     /auth/callback exchanges the OAuth code and writes the session
   *            cookies itself. A refresh pass wrapped around that is at best
   *            redundant and at worst racing it.
   * - _next    build output and the image optimiser.
   * - sw.js and the file extensions: public/ assets, which never carry a
   *            session and are requested constantly.
   */
  matcher: [
    "/((?!api|auth|_next/static|_next/image|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav)$).*)",
  ],
};
