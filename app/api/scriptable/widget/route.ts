import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  readScriptableYumiWidgetSnapshot,
} from "@/lib/scriptable/widgetSnapshotRepository";
import {
  authenticateScriptableYumiToken,
  extractScriptableYumiBearerToken,
} from "@/lib/scriptable/widgetToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord =
  Record<string, unknown>;

const RESPONSE_HEADERS = {
  "Cache-Control":
    "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

function jsonResponse(
  body: JsonRecord,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return NextResponse.json(body, {
    status,
    headers: {
      ...RESPONSE_HEADERS,
      ...extraHeaders,
    },
  });
}

function unauthorizedResponse() {
  return jsonResponse(
    {
      ok: false,
      state: "unauthorized",
      error:
        "A valid Scriptable Widget bearer token is required.",
    },
    401,
    {
      "WWW-Authenticate":
        'Bearer realm="Exchange Notes Scriptable Widget"',
    },
  );
}

/**
 * Public Scriptable Widget data endpoint.
 *
 * Authentication is performed only through the personal bearer token.
 * Supabase browser sessions and request cookies are not used here.
 */
export async function GET(
  request: NextRequest,
) {
  const token =
    extractScriptableYumiBearerToken(
      request.headers.get(
        "authorization",
      ),
    );

  if (!token) {
    return unauthorizedResponse();
  }

  try {
    const userId =
      await authenticateScriptableYumiToken(
        token,
      );

    if (!userId) {
      return unauthorizedResponse();
    }

    const snapshot =
      await readScriptableYumiWidgetSnapshot(
        userId,
      );

    if (!snapshot) {
      return jsonResponse(
        {
          ok: false,
          state: "snapshot-missing",
          error:
            "No Yumi Widget snapshot is available yet.",
        },
        404,
      );
    }

    return jsonResponse({
      ok: true,
      snapshot,
    });
  } catch (error) {
    console.error(
      "Scriptable Widget request failed.",
      {
        message:
          error instanceof Error
            ? error.message
            : "Unknown server error",
      },
    );

    return jsonResponse(
      {
        ok: false,
        state: "server-error",
        error:
          "The Yumi Widget snapshot could not be loaded.",
      },
      500,
    );
  }
}
