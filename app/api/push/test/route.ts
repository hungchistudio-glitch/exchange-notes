import { NextRequest, NextResponse } from "next/server";

import {
  sendWebPushNotification,
  type WebPushSendResult,
} from "@/lib/push/sendWebPush";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEST_SUBSCRIPTIONS = 20;

type SubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type Delivery = {
  subscriptionId: string;
  result: WebPushSendResult;
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

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  return origin === request.nextUrl.origin;
}

async function sendTestNotification(
  subscription: SubscriptionRow,
): Promise<Delivery> {
  try {
    const result = await sendWebPushNotification(
      {
        id: subscription.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
      {
        title: "Exchange Notes",
        body: "Web Push is working on this device.",
        url: "/profile",
        tag: "exchange-notes-web-push-test",
        renotify: true,
        data: {
          kind: "web-push-test",
        },
      },
      {
        ttlSeconds: 60,
      },
    );

    return {
      subscriptionId: subscription.id,
      result,
    };
  } catch {
    return {
      subscriptionId: subscription.id,
      result: {
        ok: false,
        state: "failed",
        statusCode: null,
        message: "The Web Push test could not be sent.",
      },
    };
  }
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return jsonResponse(
      {
        ok: false,
        error: "Invalid request origin.",
      },
      403,
    );
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        {
          ok: false,
          error: "Authentication required.",
        },
        401,
      );
    }

    const {
      data,
      error: subscriptionError,
    } = await supabase
      .from("web_push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", user.id)
      .eq("enabled", true)
      .order("updated_at", {
        ascending: false,
      })
      .limit(MAX_TEST_SUBSCRIPTIONS);

    if (subscriptionError) {
      console.error(
        "Web Push test subscription lookup failed.",
        {
          userId: user.id,
          code: subscriptionError.code,
          message: subscriptionError.message,
        },
      );

      return jsonResponse(
        {
          ok: false,
          error:
            "Active notification subscriptions could not be loaded.",
        },
        500,
      );
    }

    const subscriptions =
      (data ?? []) as SubscriptionRow[];

    if (subscriptions.length === 0) {
      return jsonResponse(
        {
          ok: false,
          state: "no-active-subscriptions",
          error:
            "No active Web Push subscriptions were found.",
        },
        409,
      );
    }

    const deliveries = await Promise.all(
      subscriptions.map(sendTestNotification),
    );

    const deliveredIds: string[] = [];
    const expiredIds: string[] = [];

    let failed = 0;

    for (const delivery of deliveries) {
      if (delivery.result.ok) {
        deliveredIds.push(delivery.subscriptionId);
        continue;
      }

      if (delivery.result.state === "expired") {
        expiredIds.push(delivery.subscriptionId);
        continue;
      }

      failed += 1;
    }

    const timestamp = new Date().toISOString();
    let databaseWarning = false;

    if (deliveredIds.length > 0) {
      const { error: lastUsedError } = await supabase
        .from("web_push_subscriptions")
        .update({
          last_used_at: timestamp,
        })
        .eq("user_id", user.id)
        .in("id", deliveredIds);

      if (lastUsedError) {
        databaseWarning = true;

        console.error(
          "Web Push last-used update failed.",
          {
            userId: user.id,
            code: lastUsedError.code,
            deliveredCount: deliveredIds.length,
          },
        );
      }
    }

    if (expiredIds.length > 0) {
      const { error: disableError } = await supabase
        .from("web_push_subscriptions")
        .update({
          enabled: false,
        })
        .eq("user_id", user.id)
        .in("id", expiredIds);

      if (disableError) {
        databaseWarning = true;

        console.error(
          "Expired Web Push cleanup failed.",
          {
            userId: user.id,
            code: disableError.code,
            expiredCount: expiredIds.length,
          },
        );
      }
    }

    const delivered = deliveredIds.length;
    const expired = expiredIds.length;
    const total = subscriptions.length;

    if (delivered === 0) {
      return jsonResponse(
        {
          ok: false,
          state:
            expired === total
              ? "all-subscriptions-expired"
              : "delivery-failed",
          total,
          delivered,
          expired,
          failed,
          databaseWarning,
        },
        expired === total ? 410 : 502,
      );
    }

    return jsonResponse({
      ok: true,
      state: "test-delivered",
      total,
      delivered,
      expired,
      failed,
      databaseWarning,
    });
  } catch (error) {
    console.error(
      "Unexpected Web Push test route failure.",
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
        error: "The Web Push test could not be completed.",
      },
      500,
    );
  }
}
