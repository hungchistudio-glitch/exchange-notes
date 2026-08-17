import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  type WebPushNotificationPayload,
} from "@/lib/push/sendWebPush";
import {
  sendWebPushToUser,
} from "@/lib/push/sendToUser";
import { createClient } from "@/lib/supabase/server";
import {
  createServiceClient,
} from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SHARED_VOCABULARY_PREFIX =
  "__SHARED_VOCABULARY__:";

type NotificationLevel =
  | "all"
  | "important"
  | "badge_only"
  | "none";

type PrivacyPreview =
  | "full"
  | "sender_only"
  | "hidden";

type NotificationPreferences = {
  notificationLevel: NotificationLevel;
  privacyPreview: PrivacyPreview;
  soundEnabled: boolean;
};

type DeliverySummary = {
  recipients: number;
  skipped: number;
  duplicates: number;
  subscriptions: number;
  delivered: number;
  expired: number;
  failed: number;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  notificationLevel: "all",
  privacyPreview: "full",
  soundEnabled: true,
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

  return !origin || origin === request.nextUrl.origin;
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

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    UUID_PATTERN.test(value)
  );
}

function emptySummary(): DeliverySummary {
  return {
    recipients: 0,
    skipped: 0,
    duplicates: 0,
    subscriptions: 0,
    delivered: 0,
    expired: 0,
    failed: 0,
  };
}

function compactText(
  value: string,
  maximumLength: number,
): string {
  const compact = value
    .replace(/\s+/g, " ")
    .trim();

  if (compact.length <= maximumLength) {
    return compact;
  }

  return `${compact.slice(
    0,
    Math.max(0, maximumLength - 1),
  )}…`;
}

function getMessagePreview(body: string): string {
  if (body.startsWith(SHARED_VOCABULARY_PREFIX)) {
    return "Shared a vocabulary card.";
  }

  const preview = compactText(body, 180);

  return preview || "Sent you a message.";
}

async function getProfileName(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, exchange_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn(
      "Push sender profile lookup failed:",
      {
        code: error.code,
        userId,
      },
    );

    return "Exchange Notes";
  }

  const displayName =
    typeof data?.display_name === "string"
      ? data.display_name.trim()
      : "";

  if (displayName) {
    return displayName;
  }

  const exchangeId =
    typeof data?.exchange_id === "string"
      ? data.exchange_id.trim()
      : "";

  return exchangeId || "Exchange Notes";
}

async function getPreferences(
  supabase: SupabaseClient,
  userId: string,
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select(
      "notification_level, privacy_preview, sound_enabled",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn(
      "Push notification preference lookup failed:",
      {
        code: error.code,
        userId,
      },
    );

    return DEFAULT_PREFERENCES;
  }

  if (!data) {
    return DEFAULT_PREFERENCES;
  }

  const notificationLevel =
    data.notification_level === "all" ||
    data.notification_level === "important" ||
    data.notification_level === "badge_only" ||
    data.notification_level === "none"
      ? data.notification_level
      : DEFAULT_PREFERENCES.notificationLevel;

  const privacyPreview =
    data.privacy_preview === "full" ||
    data.privacy_preview === "sender_only" ||
    data.privacy_preview === "hidden"
      ? data.privacy_preview
      : DEFAULT_PREFERENCES.privacyPreview;

  return {
    notificationLevel,
    privacyPreview,
    soundEnabled:
      data.sound_enabled !== false,
  };
}

function shouldSendPush(
  preferences: NotificationPreferences,
): boolean {
  return (
    preferences.notificationLevel === "all" ||
    preferences.notificationLevel === "important"
  );
}

function applyPrivacy(
  senderName: string,
  completeBody: string,
  genericBody: string,
  preferences: NotificationPreferences,
): Pick<
  WebPushNotificationPayload,
  "title" | "body"
> {
  switch (preferences.privacyPreview) {
    case "hidden":
      return {
        title: "Exchange Notes",
        body: genericBody,
      };

    case "sender_only":
      return {
        title: senderName,
        body: genericBody,
      };

    case "full":
    default:
      return {
        title: senderName,
        body: completeBody,
      };
  }
}

async function claimDelivery(
  supabase: SupabaseClient,
  eventKind:
    | "message"
    | "friend_request"
    | "friend_accepted",
  eventId: string,
  recipientUserId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("web_push_event_deliveries")
    .insert({
      event_kind: eventKind,
      event_id: eventId,
      recipient_user_id: recipientUserId,
    });

  if (!error) {
    return true;
  }

  if (error.code === "23505") {
    return false;
  }

  throw new Error(
    `Push event delivery could not be claimed: ${error.code}`,
  );
}

async function releaseDelivery(
  supabase: SupabaseClient,
  eventKind:
    | "message"
    | "friend_request"
    | "friend_accepted",
  eventId: string,
  recipientUserId: string,
): Promise<void> {
  const { error } = await supabase
    .from("web_push_event_deliveries")
    .delete()
    .eq("event_kind", eventKind)
    .eq("event_id", eventId)
    .eq(
      "recipient_user_id",
      recipientUserId,
    );

  if (error) {
    console.warn(
      "Push event claim release failed:",
      {
        code: error.code,
        eventKind,
      },
    );
  }
}

async function deliverToRecipient(
  supabase: SupabaseClient,
  summary: DeliverySummary,
  input: {
    eventKind:
      | "message"
      | "friend_request"
      | "friend_accepted";
    eventId: string;
    recipientUserId: string;
    payload: WebPushNotificationPayload;
  },
): Promise<void> {
  summary.recipients += 1;

  const preferences = await getPreferences(
    supabase,
    input.recipientUserId,
  );

  if (!shouldSendPush(preferences)) {
    summary.skipped += 1;
    return;
  }

  const claimed = await claimDelivery(
    supabase,
    input.eventKind,
    input.eventId,
    input.recipientUserId,
  );

  if (!claimed) {
    summary.duplicates += 1;
    return;
  }

  try {
    const result = await sendWebPushToUser(
      supabase,
      input.recipientUserId,
      {
        ...input.payload,
        silent: !preferences.soundEnabled,
      },
      {
        ttlSeconds: 300,
      },
    );

    summary.subscriptions += result.total;
    summary.delivered += result.delivered;
    summary.expired += result.expired;
    summary.failed += result.failed;

    if (
      result.delivered === 0 &&
      result.failed > 0
    ) {
      await releaseDelivery(
        supabase,
        input.eventKind,
        input.eventId,
        input.recipientUserId,
      );
    }
  } catch (error) {
    await releaseDelivery(
      supabase,
      input.eventKind,
      input.eventId,
      input.recipientUserId,
    );

    throw error;
  }
}

async function handleMessageEvent(
  supabase: SupabaseClient,
  authenticatedUserId: string,
  messageId: number,
): Promise<DeliverySummary> {
  const { data: message, error: messageError } =
    await supabase
      .from("messages")
      .select(
        "id, conversation_id, sender_id, body",
      )
      .eq("id", messageId)
      .maybeSingle();

  if (messageError) {
    throw new Error(
      `Message event could not be loaded: ${messageError.code}`,
    );
  }

  if (!message) {
    throw new Error("MESSAGE_NOT_FOUND");
  }

  if (message.sender_id !== authenticatedUserId) {
    throw new Error("MESSAGE_FORBIDDEN");
  }

  const {
    data: recipientRows,
    error: recipientError,
  } = await supabase
    .from("conversation_members")
    .select("user_id, muted_at")
    .eq(
      "conversation_id",
      message.conversation_id,
    )
    .neq("user_id", authenticatedUserId);

  if (recipientError) {
    throw new Error(
      `Message recipients could not be loaded: ${recipientError.code}`,
    );
  }

  const senderName = await getProfileName(
    supabase,
    authenticatedUserId,
  );

  const summary = emptySummary();

  for (const recipient of recipientRows ?? []) {
    if (recipient.muted_at) {
      summary.recipients += 1;
      summary.skipped += 1;
      continue;
    }

    const preferences = await getPreferences(
      supabase,
      recipient.user_id,
    );

    if (!shouldSendPush(preferences)) {
      summary.recipients += 1;
      summary.skipped += 1;
      continue;
    }

    const visible = applyPrivacy(
      senderName,
      getMessagePreview(
        typeof message.body === "string"
          ? message.body
          : "",
      ),
      "Sent you a new message.",
      preferences,
    );

    await deliverToRecipient(
      supabase,
      summary,
      {
        eventKind: "message",
        eventId: String(message.id),
        recipientUserId: recipient.user_id,
        payload: {
          ...visible,
          // Straight to the conversation. The id is already on the message
          // being notified about, so there is no need to send the recipient
          // through a friend-to-conversation lookup on arrival.
          url: `/messages/${message.conversation_id}`,
          tag: `message-${message.id}`,
          renotify: true,
          data: {
            kind: "message",
            messageId: message.id,
            conversationId:
              message.conversation_id,
          },
        },
      },
    );
  }

  return summary;
}

async function handleFriendRequestEvent(
  supabase: SupabaseClient,
  authenticatedUserId: string,
  targetUserId: string,
): Promise<DeliverySummary> {
  const { data: request, error } = await supabase
    .from("friend_requests")
    .select(
      "id, sender_id, receiver_id, status",
    )
    .eq("sender_id", authenticatedUserId)
    .eq("receiver_id", targetUserId)
    .eq("status", "pending")
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Friend request event could not be loaded: ${error.code}`,
    );
  }

  if (!request) {
    throw new Error("FRIEND_REQUEST_NOT_FOUND");
  }

  const senderName = await getProfileName(
    supabase,
    authenticatedUserId,
  );

  const preferences = await getPreferences(
    supabase,
    request.receiver_id,
  );

  const summary = emptySummary();

  if (!shouldSendPush(preferences)) {
    summary.recipients = 1;
    summary.skipped = 1;
    return summary;
  }

  const visible = applyPrivacy(
    senderName,
    "Sent you a friend request.",
    "You have a new friend request.",
    preferences,
  );

  await deliverToRecipient(
    supabase,
    summary,
    {
      eventKind: "friend_request",
      eventId: request.id,
      recipientUserId: request.receiver_id,
      payload: {
        ...visible,
        url: "/friends",
        tag: `friend-request-${request.id}`,
        renotify: true,
        data: {
          kind: "friend-request",
          requestId: request.id,
        },
      },
    },
  );

  return summary;
}

async function handleFriendAcceptedEvent(
  supabase: SupabaseClient,
  authenticatedUserId: string,
  requestId: string,
): Promise<DeliverySummary> {
  const { data: request, error } = await supabase
    .from("friend_requests")
    .select(
      "id, sender_id, receiver_id, status",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Accepted friend request could not be loaded: ${error.code}`,
    );
  }

  if (!request) {
    throw new Error("FRIEND_REQUEST_NOT_FOUND");
  }

  if (
    request.receiver_id !== authenticatedUserId ||
    request.status !== "accepted"
  ) {
    throw new Error("FRIEND_ACCEPTED_FORBIDDEN");
  }

  const accepterName = await getProfileName(
    supabase,
    authenticatedUserId,
  );

  const preferences = await getPreferences(
    supabase,
    request.sender_id,
  );

  const summary = emptySummary();

  if (!shouldSendPush(preferences)) {
    summary.recipients = 1;
    summary.skipped = 1;
    return summary;
  }

  const visible = applyPrivacy(
    accepterName,
    "Accepted your friend request.",
    "A friend request was accepted.",
    preferences,
  );

  await deliverToRecipient(
    supabase,
    summary,
    {
      eventKind: "friend_accepted",
      eventId: request.id,
      recipientUserId: request.sender_id,
      payload: {
        ...visible,
        url: "/friends",
        tag: `friend-accepted-${request.id}`,
        renotify: true,
        data: {
          kind: "friend-accepted",
          requestId: request.id,
        },
      },
    },
  );

  return summary;
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

  const authenticated = await createClient();

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

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: "Request body must contain valid JSON.",
      },
      400,
    );
  }

  if (!isRecord(body)) {
    return jsonResponse(
      {
        ok: false,
        error: "Invalid Push event request.",
      },
      400,
    );
  }

  const service = createServiceClient();

  try {
    let summary: DeliverySummary;

    switch (body.kind) {
      case "message": {
        const messageId = body.messageId;

        if (
          typeof messageId !== "number" ||
          !Number.isSafeInteger(messageId) ||
          messageId <= 0
        ) {
          return jsonResponse(
            {
              ok: false,
              error: "A valid message ID is required.",
            },
            400,
          );
        }

        summary = await handleMessageEvent(
          service,
          user.id,
          messageId,
        );

        break;
      }

      case "friend-request": {
        if (!isUuid(body.targetUserId)) {
          return jsonResponse(
            {
              ok: false,
              error:
                "A valid friend target user ID is required.",
            },
            400,
          );
        }

        summary =
          await handleFriendRequestEvent(
            service,
            user.id,
            body.targetUserId,
          );

        break;
      }

      case "friend-accepted": {
        if (!isUuid(body.requestId)) {
          return jsonResponse(
            {
              ok: false,
              error:
                "A valid friend request ID is required.",
            },
            400,
          );
        }

        summary =
          await handleFriendAcceptedEvent(
            service,
            user.id,
            body.requestId,
          );

        break;
      }

      default:
        return jsonResponse(
          {
            ok: false,
            error: "Unsupported Push event kind.",
          },
          400,
        );
    }

    return jsonResponse({
      ok: true,
      ...summary,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown Push event error.";

    if (message.endsWith("_NOT_FOUND")) {
      return jsonResponse(
        {
          ok: false,
          error: "The source event was not found.",
        },
        404,
      );
    }

    if (
      message.endsWith("_FORBIDDEN") ||
      message === "MESSAGE_FORBIDDEN"
    ) {
      return jsonResponse(
        {
          ok: false,
          error:
            "You cannot deliver this Push event.",
        },
        403,
      );
    }

    console.error(
      "Application Web Push event failed:",
      {
        message,
        userId: user.id,
      },
    );

    return jsonResponse(
      {
        ok: false,
        error:
          "The application notification could not be delivered.",
      },
      500,
    );
  }
}
