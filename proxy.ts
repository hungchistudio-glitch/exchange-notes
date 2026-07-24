import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(
  request: NextRequest,
) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/home/:path*",
    "/capture/:path*",
    "/coach/:path*",
    "/discover/:path*",
    "/friends/:path*",
    "/grammar/:path*",
    "/messages/:path*",
    "/profile/:path*",
    "/pronunciation/:path*",
    "/review/:path*",
    "/settings/:path*",
    "/vocabulary/:path*",
  ],
};
