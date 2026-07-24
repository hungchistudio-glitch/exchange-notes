import { NextResponse } from "next/server";

import { ensureProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

function getSafeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/launch";
  }

  return value;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeRedirectPath(
    requestUrl.searchParams.get("next"),
  );

  console.log("[OAuth callback] request received", {
    origin: requestUrl.origin,
    hasCode: Boolean(code),
    next,
    hasForwardedHost: Boolean(
      request.headers.get("x-forwarded-host"),
    ),
  });

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/login?error=oauth_callback",
        requestUrl.origin,
      ),
    );
  }

  const supabase = await createClient();

  const {
    data,
    error,
  } = await supabase.auth.exchangeCodeForSession(code);

  console.log("[OAuth callback] code exchange result", {
    success: !error && Boolean(data.user),
    hasUser: Boolean(data.user),
    userId: data.user?.id ?? null,
    errorMessage: error?.message ?? null,
  });

  if (error || !data.user) {
    console.error(
      "Google OAuth callback failed:",
      error?.message ?? "No authenticated user returned.",
    );

    return NextResponse.redirect(
      new URL(
        "/login?error=oauth_callback",
        requestUrl.origin,
      ),
    );
  }

  try {
    await ensureProfile(supabase, data.user);

    console.log("[OAuth callback] profile ready", {
      userId: data.user.id,
    });
  } catch (profileError) {
    console.error(
      "Google profile bootstrap failed:",
      profileError,
    );

    return NextResponse.redirect(
      new URL(
        "/login?error=profile_setup",
        requestUrl.origin,
      ),
    );
  }

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
