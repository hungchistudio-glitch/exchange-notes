import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function getSafeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/home";
  }

  return value;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = getSafeRedirectPath(requestUrl.searchParams.get("next"));

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL(
        "/login?verification=invalid",
        requestUrl.origin,
      ),
    );
  }

  const supabase = await createClient();

  const {
    data,
    error,
  } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error || !data.user) {
    console.error(
      "Email verification failed:",
      error?.message ?? "No authenticated user returned.",
    );

    return NextResponse.redirect(
      new URL(
        "/login?verification=failed",
        requestUrl.origin,
      ),
    );
  }

  const displayName =
    typeof data.user.user_metadata?.display_name === "string"
      ? data.user.user_metadata.display_name.trim()
      : "";

  const exchangeId =
    typeof data.user.user_metadata?.exchange_id === "string"
      ? data.user.user_metadata.exchange_id.trim()
      : "";

  const email = data.user.email?.trim().toLowerCase() ?? "";

  /*
   * Ensure the public profile exists after the email has been verified.
   * This is a fallback in case the project does not already have an
   * auth.users -> profiles database trigger.
   */
  if (displayName && exchangeId && email) {
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: data.user.id,
          display_name: displayName,
          exchange_id: exchangeId,
          email,
        },
        {
          onConflict: "id",
        },
      );

    if (profileError) {
      console.warn(
        "Verified user profile upsert failed:",
        profileError.message,
      );
    }
  }

  return NextResponse.redirect(
    new URL(next, requestUrl.origin),
  );
}
