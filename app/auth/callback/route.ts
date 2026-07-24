import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function getSafeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/home";
  }

  return value;
}

function getMetadataString(user: User, keys: string[]) {
  for (const key of keys) {
    const value = user.user_metadata?.[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function createDisplayName(user: User) {
  const metadataName = getMetadataString(user, [
    "display_name",
    "full_name",
    "name",
  ]);

  if (metadataName) {
    return metadataName;
  }

  const emailName = user.email?.split("@")[0]?.trim();

  return emailName || "Exchange Notes User";
}

function createExchangeId(user: User) {
  const emailPrefix =
    user.email?.split("@")[0]?.toLowerCase() ?? "user";

  const normalizedPrefix = emailPrefix
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 18);

  const safePrefix = normalizedPrefix || "user";
  const uniqueSuffix = user.id.replace(/-/g, "").slice(0, 6);

  return `${safePrefix}_${uniqueSuffix}`;
}

async function ensureGoogleProfile(user: User) {
  const supabase = await createClient();

  const {
    data: existingProfile,
    error: lookupError,
  } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (lookupError) {
    throw new Error(
      `Profile lookup failed: ${lookupError.message}`,
    );
  }

  if (existingProfile) {
    return;
  }

  const email = user.email?.trim().toLowerCase();

  if (!email) {
    throw new Error(
      "Google did not return an email address.",
    );
  }

  const avatarUrl =
    getMetadataString(user, [
      "avatar_url",
      "picture",
    ]) || null;

  const { error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email,
      display_name: createDisplayName(user),
      exchange_id: createExchangeId(user),
      avatar_url: avatarUrl,
    });

  if (insertError) {
    throw new Error(
      `Profile creation failed: ${insertError.message}`,
    );
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeRedirectPath(
    requestUrl.searchParams.get("next"),
  );

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
    await ensureGoogleProfile(data.user);
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
