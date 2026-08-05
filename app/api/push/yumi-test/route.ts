import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  sendWebPushToUser,
} from "@/lib/push/sendToUser";
import {
  createClient,
} from "@/lib/supabase/server";
import {
  createServiceClient,
} from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function isAllowedOrigin(
  request: NextRequest,
): boolean {
  const origin = request.headers.get("origin");

  return (
    !origin ||
    origin === request.nextUrl.origin
  );
}

export async function POST(
  request: NextRequest,
) {
  if (!isAllowedOrigin(request)) {
    return jsonResponse(
      {
        ok: false,
        error: "Invalid request origin.",
      },
      403,
    );
  }

  const authenticated =
    await createClient();

  const {
    data: { user },
    error: userError,
  } = await authenticated.auth.getUser();

  if (userError || !user) {
    return jsonResponse(
      {
        ok: false,
        error: "Authentication required.",
      },
      401,
    );
  }

  const service = createServiceClient();

  try {
    const result =
      await sendWebPushToUser(
        service,
        user.id,
        {
          title:
            "Yumi 想你了 · Yumi misses you",
          body:
            "今天還沒餵我單字餅乾呢！Come feed me one word cookie.",
          url: "/vocabulary",
          tag: "yumi-reminder-test",
          renotify: true,
          data: {
            kind: "yumi-reminder-test",
          },
        },
        {
          ttlSeconds: 300,
        },
      );

    if (result.total === 0) {
      return jsonResponse(
        {
          ok: false,
          error:
            "No active Push subscription was found.",
        },
        409,
      );
    }

    if (result.delivered === 0) {
      return jsonResponse(
        {
          ok: false,
          error:
            "The Yumi test notification could not be delivered.",
          ...result,
        },
        502,
      );
    }

    return jsonResponse({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "Yumi test notification failed:",
      {
        message:
          error instanceof Error
            ? error.message
            : "Unknown error",
        userId: user.id,
      },
    );

    return jsonResponse(
      {
        ok: false,
        error:
          "The Yumi test notification could not be sent.",
      },
      500,
    );
  }
}
