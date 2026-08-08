import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  issueScriptableYumiToken,
  readScriptableYumiTokenStatus,
  revokeScriptableYumiToken,
} from "@/lib/scriptable/widgetToken";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord =
  Record<string, unknown>;

function jsonResponse(
  body: JsonRecord,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control":
        "no-store, max-age=0",
    },
  });
}

function hasAllowedOrigin(
  request: NextRequest,
): boolean {
  const origin =
    request.headers.get("origin");

  return (
    !origin
    || origin === request.nextUrl.origin
  );
}

async function authenticatedUserId():
  Promise<string | null> {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
    error,
  } = await supabase.auth.getUser();

  return error || !user
    ? null
    : user.id;
}

export async function GET() {
  const userId =
    await authenticatedUserId();

  if (!userId) {
    return jsonResponse(
      {
        ok: false,
        error:
          "Authentication required.",
      },
      401,
    );
  }

  try {
    const status =
      await readScriptableYumiTokenStatus(
        userId,
      );

    return jsonResponse({
      ok: true,
      configured: status !== null,
      token: status,
    });
  } catch (error) {
    console.error(
      "Scriptable token status could not be loaded.",
      {
        userId,
        message:
          error instanceof Error
            ? error.message
            : "Unknown server error",
      },
    );

    return jsonResponse(
      {
        ok: false,
        error:
          "Scriptable token status could not be loaded.",
      },
      500,
    );
  }
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

  const userId =
    await authenticatedUserId();

  if (!userId) {
    return jsonResponse(
      {
        ok: false,
        error:
          "Authentication required.",
      },
      401,
    );
  }

  try {
    const issued =
      await issueScriptableYumiToken(
        userId,
      );

    return jsonResponse({
      ok: true,
      token: issued.token,
      tokenPrefix: issued.prefix,
      createdAt: issued.createdAt,
    });
  } catch (error) {
    console.error(
      "Scriptable token could not be created.",
      {
        userId,
        message:
          error instanceof Error
            ? error.message
            : "Unknown server error",
      },
    );

    return jsonResponse(
      {
        ok: false,
        error:
          "Scriptable token could not be created.",
      },
      500,
    );
  }
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

  const userId =
    await authenticatedUserId();

  if (!userId) {
    return jsonResponse(
      {
        ok: false,
        error:
          "Authentication required.",
      },
      401,
    );
  }

  try {
    const revoked =
      await revokeScriptableYumiToken(
        userId,
      );

    return jsonResponse({
      ok: true,
      revoked,
    });
  } catch (error) {
    console.error(
      "Scriptable token could not be revoked.",
      {
        userId,
        message:
          error instanceof Error
            ? error.message
            : "Unknown server error",
      },
    );

    return jsonResponse(
      {
        ok: false,
        error:
          "Scriptable token could not be revoked.",
      },
      500,
    );
  }
}
