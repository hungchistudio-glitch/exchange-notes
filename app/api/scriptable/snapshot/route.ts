import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createScriptableYumiWidgetSnapshot,
  normalizeYumiWidgetPayload,
} from "@/lib/scriptable/widgetPayload";
import {
  deleteScriptableYumiWidgetSnapshot,
  readScriptableYumiWidgetSnapshot,
  saveScriptableYumiWidgetSnapshot,
} from "@/lib/scriptable/widgetSnapshotRepository";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES =
  96 * 1024;

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

function isRecord(
  value: unknown,
): value is JsonRecord {
  return (
    typeof value === "object"
    && value !== null
    && !Array.isArray(value)
  );
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

function looksLikeYumiPayload(
  value: unknown,
): value is JsonRecord {
  return (
    isRecord(value)
    && typeof value.cookieCount === "number"
    && typeof value.cookieGoal === "number"
    && typeof value.moodKey === "string"
    && typeof value.interfaceLanguage === "string"
    && typeof value.learningLanguage === "string"
    && Array.isArray(value.words)
    && isRecord(value.localizedText)
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

async function readJsonBody(
  request: NextRequest,
): Promise<
  | {
      ok: true;
      value: JsonRecord;
    }
  | {
      ok: false;
      status: number;
      error: string;
    }
> {
  const contentType =
    request.headers
      .get("content-type")
      ?.toLowerCase()
    ?? "";

  if (
    !contentType.includes(
      "application/json",
    )
  ) {
    return {
      ok: false,
      status: 415,
      error:
        "Content-Type must be application/json.",
    };
  }

  const declaredLength =
    Number(
      request.headers.get(
        "content-length",
      ),
    );

  if (
    Number.isFinite(declaredLength)
    && declaredLength > MAX_REQUEST_BYTES
  ) {
    return {
      ok: false,
      status: 413,
      error: "Request body is too large.",
    };
  }

  let text: string;

  try {
    text = await request.text();
  } catch {
    return {
      ok: false,
      status: 400,
      error:
        "Request body could not be read.",
    };
  }

  if (
    Buffer.byteLength(text, "utf8")
    > MAX_REQUEST_BYTES
  ) {
    return {
      ok: false,
      status: 413,
      error: "Request body is too large.",
    };
  }

  let value: unknown;

  try {
    value = JSON.parse(text);
  } catch {
    return {
      ok: false,
      status: 400,
      error:
        "Request body must contain valid JSON.",
    };
  }

  if (!isRecord(value)) {
    return {
      ok: false,
      status: 400,
      error:
        "Request body must be a JSON object.",
    };
  }

  return {
    ok: true,
    value,
  };
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
    const snapshot =
      await readScriptableYumiWidgetSnapshot(
        userId,
      );

    return jsonResponse({
      ok: true,
      snapshot,
    });
  } catch (error) {
    console.error(
      "Scriptable snapshot could not be loaded.",
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
          "Scriptable snapshot could not be loaded.",
      },
      500,
    );
  }
}

export async function PUT(
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

  const parsedBody =
    await readJsonBody(request);

  if (!parsedBody.ok) {
    return jsonResponse(
      {
        ok: false,
        error: parsedBody.error,
      },
      parsedBody.status,
    );
  }

  const candidate =
    parsedBody.value.payload;

  if (!looksLikeYumiPayload(candidate)) {
    return jsonResponse(
      {
        ok: false,
        error:
          "A valid Yumi Widget payload is required.",
      },
      400,
    );
  }

  const payload =
    normalizeYumiWidgetPayload(
      candidate,
    );

  if (!payload) {
    return jsonResponse(
      {
        ok: false,
        error:
          "The Yumi Widget payload is invalid.",
      },
      400,
    );
  }

  try {
    const snapshot =
      createScriptableYumiWidgetSnapshot(
        payload,
      );

    const storedSnapshot =
      await saveScriptableYumiWidgetSnapshot(
        userId,
        snapshot,
      );

    return jsonResponse({
      ok: true,
      snapshot: storedSnapshot,
    });
  } catch (error) {
    console.error(
      "Scriptable snapshot could not be saved.",
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
          "Scriptable snapshot could not be saved.",
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
    await deleteScriptableYumiWidgetSnapshot(
      userId,
    );

    return jsonResponse({
      ok: true,
      deleted: true,
    });
  } catch (error) {
    console.error(
      "Scriptable snapshot could not be deleted.",
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
          "Scriptable snapshot could not be deleted.",
      },
      500,
    );
  }
}
