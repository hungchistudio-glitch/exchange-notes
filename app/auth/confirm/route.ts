import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { ensureProfile } from "@/lib/auth/profile";
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
  const type = requestUrl.searchParams.get(
    "type",
  ) as EmailOtpType | null;
  const next = getSafeRedirectPath(
    requestUrl.searchParams.get("next"),
  );

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

  try {
    await ensureProfile(supabase, data.user);
  } catch (profileError) {
    console.error(
      "Verified user profile bootstrap failed:",
      profileError,
    );

    return NextResponse.redirect(
      new URL(
        "/login?verification=profile_setup_failed",
        requestUrl.origin,
      ),
    );
  }

  return NextResponse.redirect(
    new URL(next, requestUrl.origin),
  );
}
