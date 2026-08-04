export type PushApplicationEvent =
  | {
      kind: "message";
      messageId: number;
    }
  | {
      kind: "friend-request";
      targetUserId: string;
    }
  | {
      kind: "friend-accepted";
      requestId: string;
    };

export async function notifyPushEvent(
  event: PushApplicationEvent,
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const response = await fetch(
      "/api/push/event",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        cache: "no-store",
        keepalive: true,
        body: JSON.stringify(event),
      },
    );

    if (!response.ok) {
      console.warn(
        "Web Push event delivery was not accepted:",
        response.status,
      );
    }
  } catch {
    // Push is best-effort. The message or friend action has
    // already succeeded and must never be rolled back here.
  }
}
