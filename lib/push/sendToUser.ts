import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  sendWebPushBatch,
  type WebPushBatchResult,
  type WebPushNotificationPayload,
  type WebPushSendOptions,
} from "@/lib/push/sendWebPush";

const MAX_USER_SUBSCRIPTIONS = 50;

type SubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function emptyBatchResult(): WebPushBatchResult {
  return {
    total: 0,
    delivered: 0,
    expired: 0,
    failed: 0,
    expiredSubscriptionIds: [],
    failures: [],
  };
}

export async function sendWebPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: WebPushNotificationPayload,
  options: WebPushSendOptions = {},
): Promise<WebPushBatchResult> {
  const { data, error } = await supabase
    .from("web_push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)
    .eq("enabled", true)
    .limit(MAX_USER_SUBSCRIPTIONS);

  if (error) {
    throw new Error(
      `Active Web Push subscriptions could not be loaded: ${error.code}`,
    );
  }

  const subscriptions =
    (data ?? []) as SubscriptionRow[];

  if (subscriptions.length === 0) {
    return emptyBatchResult();
  }

  const result = await sendWebPushBatch(
    subscriptions,
    payload,
    options,
  );

  const now = new Date().toISOString();

  if (result.delivered > 0) {
    const subscriptionIds = subscriptions.map(
      (subscription) => subscription.id,
    );

    const { error: usageError } = await supabase
      .from("web_push_subscriptions")
      .update({
        last_used_at: now,
        updated_at: now,
      })
      .in("id", subscriptionIds);

    if (usageError) {
      console.warn(
        "Web Push subscription usage update failed:",
        {
          code: usageError.code,
          userId,
        },
      );
    }
  }

  if (result.expiredSubscriptionIds.length > 0) {
    const { error: expirationError } = await supabase
      .from("web_push_subscriptions")
      .update({
        enabled: false,
        updated_at: now,
      })
      .in(
        "id",
        result.expiredSubscriptionIds,
      );

    if (expirationError) {
      console.warn(
        "Expired Web Push subscription cleanup failed:",
        {
          code: expirationError.code,
          userId,
          count:
            result.expiredSubscriptionIds.length,
        },
      );
    }
  }

  return result;
}
