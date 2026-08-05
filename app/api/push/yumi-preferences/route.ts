import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_TIME_ZONE =
  "America/New_York";

type PreferenceResponse = {
  enabled: boolean;
  timeZone: string;
};

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

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function normalizeTimeZone(
  value: unknown,
): string | null {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 100
  ) {
    return null;
  }

  try {
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: value,
      },
    ).format(new Date());

    return value;
  } catch {
    return null;
  }
}

async function requireUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return {
    supabase,
    user:
      error || !user
        ? null
        : user,
  };
}

export async function GET() {
  const {
    supabase,
    user,
  } = await requireUser();

  if (!user) {
    return jsonResponse(
      {
        ok: false,
        error: "Authentication required.",
      },
      401,
    );
  }

  const { data, error } = await supabase
    .from("notification_preferences")
    .select(
      "yumi_reminders_enabled, time_zone",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error(
      "Yumi reminder preferences could not be loaded:",
      {
        code: error.code,
        userId: user.id,
      },
    );

    return jsonResponse(
      {
        ok: false,
        error:
          "Yumi reminder preferences could not be loaded.",
      },
      500,
    );
  }

  const preferences: PreferenceResponse = {
    enabled:
      data?.yumi_reminders_enabled === true,
    timeZone:
      normalizeTimeZone(data?.time_zone) ??
      DEFAULT_TIME_ZONE,
  };

  return jsonResponse({
    ok: true,
    ...preferences,
  });
}

export async function PUT(
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

  const {
    supabase,
    user,
  } = await requireUser();

  if (!user) {
    return jsonResponse(
      {
        ok: false,
        error: "Authentication required.",
      },
      401,
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        error:
          "Request body must contain valid JSON.",
      },
      400,
    );
  }

  if (
    !isRecord(body) ||
    typeof body.enabled !== "boolean"
  ) {
    return jsonResponse(
      {
        ok: false,
        error:
          "A valid Yumi reminder setting is required.",
      },
      400,
    );
  }

  const timeZone =
    normalizeTimeZone(body.timeZone);

  if (!timeZone) {
    return jsonResponse(
      {
        ok: false,
        error:
          "A valid device timezone is required.",
      },
      400,
    );
  }

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        user_id: user.id,
        yumi_reminders_enabled:
          body.enabled,
        time_zone: timeZone,
        updated_at: now,
      },
      {
        onConflict: "user_id",
      },
    );

  if (error) {
    console.error(
      "Yumi reminder preferences could not be saved:",
      {
        code: error.code,
        userId: user.id,
      },
    );

    return jsonResponse(
      {
        ok: false,
        error:
          "Yumi reminder preferences could not be saved.",
      },
      500,
    );
  }

  return jsonResponse({
    ok: true,
    enabled: body.enabled,
    timeZone,
  });
}
