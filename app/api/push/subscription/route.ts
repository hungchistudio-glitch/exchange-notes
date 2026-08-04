import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

type JsonRecord = Record<string, unknown>;

type ValidatedSubscription = {
  endpoint: string;
  expirationTime: number | null;
  p256dh: string;
  auth: string;
  deviceName: string | null;
};

function jsonResponse(
  body: JsonRecord,
  status = 200
): NextResponse<JsonRecord> {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function isRecord(value: unknown): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function validateEndpoint(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const endpoint = value.trim();

  if (endpoint.length < 10 || endpoint.length > 2048) {
    return null;
  }

  try {
    const url = new URL(endpoint);

    if (url.protocol !== "https:") {
      return null;
    }
  } catch {
    return null;
  }

  return endpoint;
}

function validateKey(
  value: unknown,
  minimumLength: number,
  maximumLength: number
): string | null {
  if (typeof value !== "string") return null;

  const key = value.trim();

  if (
    key.length < minimumLength ||
    key.length > maximumLength
  ) {
    return null;
  }

  return key;
}

function validateExpirationTime(
  value: unknown
): number | null | undefined {
  if (value === null || value === undefined) {
    return null;
  }

  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    return undefined;
  }

  return value;
}

function validateDeviceName(
  value: unknown
): string | null | undefined {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const deviceName = value.trim();

  if (deviceName.length === 0) {
    return null;
  }

  if (deviceName.length > 120) {
    return undefined;
  }

  return deviceName;
}

function validateSubscription(
  value: unknown
):
  | { ok: true; subscription: ValidatedSubscription }
  | { ok: false; message: string } {
  if (!isRecord(value)) {
    return {
      ok: false,
      message: "Request body must be a JSON object.",
    };
  }

  const endpoint = validateEndpoint(value.endpoint);

  if (!endpoint) {
    return {
      ok: false,
      message: "A valid HTTPS push endpoint is required.",
    };
  }

  if (!isRecord(value.keys)) {
    return {
      ok: false,
      message: "Push subscription keys are required.",
    };
  }

  const p256dh = validateKey(value.keys.p256dh, 16, 512);

  if (!p256dh) {
    return {
      ok: false,
      message: "A valid p256dh key is required.",
    };
  }

  const auth = validateKey(value.keys.auth, 8, 256);

  if (!auth) {
    return {
      ok: false,
      message: "A valid auth key is required.",
    };
  }

  const expirationTime = validateExpirationTime(
    value.expirationTime
  );

  if (expirationTime === undefined) {
    return {
      ok: false,
      message: "expirationTime must be a non-negative integer or null.",
    };
  }

  const deviceName = validateDeviceName(value.deviceName);

  if (deviceName === undefined) {
    return {
      ok: false,
      message: "deviceName must be a string of 120 characters or fewer.",
    };
  }

  return {
    ok: true,
    subscription: {
      endpoint,
      expirationTime,
      p256dh,
      auth,
      deviceName,
    },
  };
}

async function requireAuthenticatedClient() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    supabase,
    user,
  };
}

async function readJson(
  request: Request
): Promise<
  | { ok: true; value: unknown }
  | { ok: false }
> {
  try {
    return {
      ok: true,
      value: await request.json(),
    };
  } catch {
    return {
      ok: false,
    };
  }
}

function getSupabaseProjectRef(): string {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!configuredUrl) {
    return "missing";
  }

  try {
    const hostname =
      new URL(configuredUrl).hostname.toLowerCase();

    const match = hostname.match(
      /^([a-z0-9]+)\.supabase\.co$/
    );

    return match?.[1] ?? "custom-domain";
  } catch {
    return "invalid-url";
  }
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedClient();

  if (!authenticated) {
    return jsonResponse(
      {
        ok: false,
        error: "Authentication required.",
      },
      401
    );
  }

  const parsedBody = await readJson(request);

  if (!parsedBody.ok) {
    return jsonResponse(
      {
        ok: false,
        error: "Request body must contain valid JSON.",
      },
      400
    );
  }

  const validation = validateSubscription(parsedBody.value);

  if (!validation.ok) {
    return jsonResponse(
      {
        ok: false,
        error: validation.message,
      },
      400
    );
  }

  const {
    endpoint,
    expirationTime,
    p256dh,
    auth,
    deviceName,
  } = validation.subscription;

  const userAgent =
    request.headers.get("user-agent")?.slice(0, 1024) ?? null;

  const { data, error } = await authenticated.supabase.rpc(
    "register_web_push_subscription",
    {
      p_endpoint: endpoint,
      p_p256dh: p256dh,
      p_auth: auth,
      p_expiration_time: expirationTime,
      p_user_agent: userAgent,
      p_device_name: deviceName,
    }
  );

  if (error) {
    console.error("Web Push subscription registration failed:", {
      code: error.code,
      message: error.message,
      userId: authenticated.user.id,
    });

    return jsonResponse(
      {
        ok: false,
        error:
          process.env.VERCEL_ENV === "preview"
            ? `Unable to register this push subscription. [${error.code} @ ${getSupabaseProjectRef()}]`
            : "Unable to register this push subscription.",
      },
      500
    );
  }

  return jsonResponse({
    ok: true,
    subscriptionId: data,
  });
}

export async function DELETE(request: Request) {
  const authenticated = await requireAuthenticatedClient();

  if (!authenticated) {
    return jsonResponse(
      {
        ok: false,
        error: "Authentication required.",
      },
      401
    );
  }

  const parsedBody = await readJson(request);

  if (!parsedBody.ok || !isRecord(parsedBody.value)) {
    return jsonResponse(
      {
        ok: false,
        error: "Request body must contain valid JSON.",
      },
      400
    );
  }

  const endpoint = validateEndpoint(parsedBody.value.endpoint);

  if (!endpoint) {
    return jsonResponse(
      {
        ok: false,
        error: "A valid HTTPS push endpoint is required.",
      },
      400
    );
  }

  const { data, error } = await authenticated.supabase.rpc(
    "unregister_web_push_subscription",
    {
      p_endpoint: endpoint,
    }
  );

  if (error) {
    console.error("Web Push subscription removal failed:", {
      code: error.code,
      message: error.message,
      userId: authenticated.user.id,
    });

    return jsonResponse(
      {
        ok: false,
        error: "Unable to disable this push subscription.",
      },
      500
    );
  }

  return jsonResponse({
    ok: true,
    disabled: data === true,
  });
}
