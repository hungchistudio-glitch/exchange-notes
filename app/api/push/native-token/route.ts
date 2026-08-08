import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";
import {
  createServiceClient,
} from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IOS_BUNDLE_ID =
  "art.hungchi.exchangenotes";

type NativeTokenInput = {
  token: string;
  environment:
    | "development"
    | "production";
  bundleId: typeof IOS_BUNDLE_ID;
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function hasAllowedOrigin(
  request: NextRequest,
): boolean {
  const origin =
    request.headers.get("origin");

  return (
    !origin ||
    origin === request.nextUrl.origin
  );
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function normalizeToken(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const token =
    value.trim().toLowerCase();

  if (
    token.length < 32 ||
    token.length > 512 ||
    !/^[0-9a-f]+$/.test(token)
  ) {
    return null;
  }

  return token;
}

function parseNativeTokenInput(
  value: unknown,
): NativeTokenInput | null {
  if (!isRecord(value)) {
    return null;
  }

  const token =
    normalizeToken(value.token);

  if (!token) {
    return null;
  }

  if (
    value.environment !== "development" &&
    value.environment !== "production"
  ) {
    return null;
  }

  if (value.bundleId !== IOS_BUNDLE_ID) {
    return null;
  }

  return {
    token,
    environment:
      value.environment,
    bundleId: IOS_BUNDLE_ID,
  };
}

async function authenticatedUser() {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
    error,
  } = await supabase.auth.getUser();

  return {
    user,
    error,
  };
}

export async function POST(
  request: NextRequest,
) {
  if (!hasAllowedOrigin(request)) {
    return jsonResponse(
      {
        ok: false,
        error: "Invalid request origin.",
      },
      403,
    );
  }

  const {
    user,
    error: userError,
  } = await authenticatedUser();

  if (userError || !user) {
    return jsonResponse(
      {
        ok: false,
        error: "Authentication required.",
      },
      401,
    );
  }

  let input: NativeTokenInput | null =
    null;

  try {
    input = parseNativeTokenInput(
      await request.json(),
    );
  } catch {
    input = null;
  }

  if (!input) {
    return jsonResponse(
      {
        ok: false,
        error:
          "Invalid native Push token payload.",
      },
      400,
    );
  }

  const service =
    createServiceClient();

  const now =
    new Date().toISOString();

  const {
    error,
  } = await service
    .from("device_tokens")
    .upsert(
      {
        user_id: user.id,
        platform: "ios",
        token: input.token,
        environment:
          input.environment,
        bundle_id: input.bundleId,
        enabled: true,
        last_seen_at: now,
        updated_at: now,
      },
      {
        onConflict:
          "platform,token",
      },
    );

  if (error) {
    console.error(
      "Native Push token registration failed:",
      {
        code: error.code,
        userId: user.id,
      },
    );

    return jsonResponse(
      {
        ok: false,
        error:
          "Native Push token could not be registered.",
      },
      500,
    );
  }

  return jsonResponse({
    ok: true,
    platform: "ios",
    environment:
      input.environment,
  });
}

export async function DELETE(
  request: NextRequest,
) {
  if (!hasAllowedOrigin(request)) {
    return jsonResponse(
      {
        ok: false,
        error: "Invalid request origin.",
      },
      403,
    );
  }

  const {
    user,
    error: userError,
  } = await authenticatedUser();

  if (userError || !user) {
    return jsonResponse(
      {
        ok: false,
        error: "Authentication required.",
      },
      401,
    );
  }

  let token: string | null = null;

  try {
    const body: unknown =
      await request.json();

    token = isRecord(body)
      ? normalizeToken(body.token)
      : null;
  } catch {
    token = null;
  }

  if (!token) {
    return jsonResponse(
      {
        ok: false,
        error:
          "A valid native Push token is required.",
      },
      400,
    );
  }

  const service =
    createServiceClient();

  const {
    error,
  } = await service
    .from("device_tokens")
    .update({
      enabled: false,
      updated_at:
        new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("platform", "ios")
    .eq("token", token);

  if (error) {
    console.error(
      "Native Push token disable failed:",
      {
        code: error.code,
        userId: user.id,
      },
    );

    return jsonResponse(
      {
        ok: false,
        error:
          "Native Push token could not be disabled.",
      },
      500,
    );
  }

  return jsonResponse({
    ok: true,
  });
}
