import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  let next = requestUrl.searchParams.get("next") ?? "/home";

  // Only allow internal redirects.
  if (!next.startsWith("/") || next.startsWith("//")) {
    next = "/home";
  }

  if (code) {
    const supabase = await createClient();

    const { error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get(
        "x-forwarded-host",
      );

      const forwardedProto =
        request.headers.get("x-forwarded-proto") ?? "https";

      if (
        process.env.NODE_ENV !== "development" &&
        forwardedHost
      ) {
        return NextResponse.redirect(
          `${forwardedProto}://${forwardedHost}${next}`,
        );
      }

      return NextResponse.redirect(
        `${requestUrl.origin}${next}`,
      );
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=oauth_callback", requestUrl.origin),
  );
}
