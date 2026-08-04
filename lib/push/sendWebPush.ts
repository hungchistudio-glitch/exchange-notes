import "server-only";

import webPush from "web-push";

const DEFAULT_TTL_SECONDS = 60;
const MAX_TTL_SECONDS = 28 * 24 * 60 * 60;
const MAX_PAYLOAD_BYTES = 3_000;

const MAX_ENDPOINT_LENGTH = 4_096;
const MAX_KEY_LENGTH = 1_024;
const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 240;
const MAX_URL_LENGTH = 2_048;
const MAX_TAG_LENGTH = 120;

export type WebPushSubscriptionInput = {
  id?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type WebPushNotificationPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  renotify?: boolean;
  silent?: boolean;
  badgeCount?: number;
  data?: Record<string, unknown>;
};

export type WebPushSendOptions = {
  ttlSeconds?: number;
};

export type WebPushSendResult =
  | {
      ok: true;
      state: "delivered";
      statusCode: number | null;
    }
  | {
      ok: false;
      state: "expired";
      statusCode: 404 | 410;
    }
  | {
      ok: false;
      state: "failed";
      statusCode: number | null;
      message: string;
    };

export type WebPushBatchFailure = {
  subscriptionId: string | null;
  statusCode: number | null;
};

export type WebPushBatchResult = {
  total: number;
  delivered: number;
  expired: number;
  failed: number;
  expiredSubscriptionIds: string[];
  failures: WebPushBatchFailure[];
};

type ErrorWithStatusCode = {
  statusCode?: unknown;
};

function requiredEnvironmentVariable(
  name:
    | "NEXT_PUBLIC_VAPID_PUBLIC_KEY"
    | "VAPID_PRIVATE_KEY"
    | "VAPID_SUBJECT",
): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Web Push is not configured: missing ${name}.`,
    );
  }

  return value;
}

function validateVapidSubject(subject: string): void {
  let parsed: URL;

  try {
    parsed = new URL(subject);
  } catch {
    throw new Error(
      "VAPID_SUBJECT must be a valid mailto: or https: URL.",
    );
  }

  if (
    parsed.protocol !== "mailto:" &&
    parsed.protocol !== "https:"
  ) {
    throw new Error(
      "VAPID_SUBJECT must use the mailto: or https: protocol.",
    );
  }

  if (
    parsed.protocol === "mailto:" &&
    !parsed.pathname.includes("@")
  ) {
    throw new Error(
      "The mailto: VAPID_SUBJECT must contain a valid email address.",
    );
  }
}

function configureVapidDetails(): void {
  const subject =
    requiredEnvironmentVariable("VAPID_SUBJECT");

  const publicKey = requiredEnvironmentVariable(
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  );

  const privateKey = requiredEnvironmentVariable(
    "VAPID_PRIVATE_KEY",
  );

  validateVapidSubject(subject);

  webPush.setVapidDetails(
    subject,
    publicKey,
    privateKey,
  );
}

function normalizeRequiredString(
  value: string,
  field: string,
  maximumLength: number,
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${field} is required.`);
  }

  if (normalized.length > maximumLength) {
    throw new Error(
      `${field} exceeds the maximum allowed length.`,
    );
  }

  return normalized;
}

function normalizeOptionalString(
  value: string | undefined,
  field: string,
  maximumLength: number,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim();

  if (!normalized) {
    return undefined;
  }

  if (normalized.length > maximumLength) {
    throw new Error(
      `${field} exceeds the maximum allowed length.`,
    );
  }

  return normalized;
}

function normalizeAppPath(
  value: string | undefined,
): string | undefined {
  const normalized = normalizeOptionalString(
    value,
    "Notification URL",
    MAX_URL_LENGTH,
  );

  if (normalized === undefined) {
    return undefined;
  }

  if (
    !normalized.startsWith("/") ||
    normalized.startsWith("//")
  ) {
    throw new Error(
      "Notification URL must be a same-origin application path.",
    );
  }

  return normalized;
}

function normalizeBadgeCount(
  value: number | undefined,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 9_999
  ) {
    throw new Error(
      "Notification badgeCount must be an integer from 0 to 9999.",
    );
  }

  return value;
}

function normalizeTtlSeconds(
  value: number | undefined,
): number {
  if (value === undefined) {
    return DEFAULT_TTL_SECONDS;
  }

  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > MAX_TTL_SECONDS
  ) {
    throw new Error(
      `Web Push TTL must be an integer from 0 to ${MAX_TTL_SECONDS}.`,
    );
  }

  return value;
}

function normalizeSubscription(
  subscription: WebPushSubscriptionInput,
) {
  const endpoint = normalizeRequiredString(
    subscription.endpoint,
    "Push endpoint",
    MAX_ENDPOINT_LENGTH,
  );

  let endpointUrl: URL;

  try {
    endpointUrl = new URL(endpoint);
  } catch {
    throw new Error(
      "Push endpoint must be a valid HTTPS URL.",
    );
  }

  if (endpointUrl.protocol !== "https:") {
    throw new Error(
      "Push endpoint must use HTTPS.",
    );
  }

  return {
    endpoint,
    keys: {
      p256dh: normalizeRequiredString(
        subscription.p256dh,
        "Push p256dh key",
        MAX_KEY_LENGTH,
      ),
      auth: normalizeRequiredString(
        subscription.auth,
        "Push auth key",
        MAX_KEY_LENGTH,
      ),
    },
  };
}

function serializePayload(
  payload: WebPushNotificationPayload,
): string {
  const normalizedPayload = {
    title: normalizeRequiredString(
      payload.title,
      "Notification title",
      MAX_TITLE_LENGTH,
    ),
    body: normalizeOptionalString(
      payload.body,
      "Notification body",
      MAX_BODY_LENGTH,
    ),
    url: normalizeAppPath(payload.url),
    tag: normalizeOptionalString(
      payload.tag,
      "Notification tag",
      MAX_TAG_LENGTH,
    ),
    renotify:
      payload.renotify === true
        ? true
        : undefined,
    silent:
      payload.silent === true
        ? true
        : undefined,
    badgeCount: normalizeBadgeCount(
      payload.badgeCount,
    ),
    data: payload.data,
  };

  let serialized: string;

  try {
    serialized = JSON.stringify(normalizedPayload);
  } catch {
    throw new Error(
      "Web Push payload must be JSON serializable.",
    );
  }

  if (
    Buffer.byteLength(serialized, "utf8") >
    MAX_PAYLOAD_BYTES
  ) {
    throw new Error(
      `Web Push payload must not exceed ${MAX_PAYLOAD_BYTES} bytes.`,
    );
  }

  return serialized;
}

function getStatusCode(
  error: unknown,
): number | null {
  if (
    typeof error !== "object" ||
    error === null ||
    !("statusCode" in error)
  ) {
    return null;
  }

  const statusCode =
    (error as ErrorWithStatusCode).statusCode;

  return typeof statusCode === "number" &&
    Number.isInteger(statusCode)
    ? statusCode
    : null;
}

function isExpiredStatusCode(
  statusCode: number | null,
): statusCode is 404 | 410 {
  return statusCode === 404 || statusCode === 410;
}

export async function sendWebPushNotification(
  subscription: WebPushSubscriptionInput,
  payload: WebPushNotificationPayload,
  options: WebPushSendOptions = {},
): Promise<WebPushSendResult> {
  configureVapidDetails();

  const normalizedSubscription =
    normalizeSubscription(subscription);

  const serializedPayload =
    serializePayload(payload);

  const ttlSeconds = normalizeTtlSeconds(
    options.ttlSeconds,
  );

  try {
    const response = await webPush.sendNotification(
      normalizedSubscription,
      serializedPayload,
      {
        TTL: ttlSeconds,
      },
    );

    return {
      ok: true,
      state: "delivered",
      statusCode:
        typeof response.statusCode === "number"
          ? response.statusCode
          : null,
    };
  } catch (error) {
    const statusCode = getStatusCode(error);

    if (isExpiredStatusCode(statusCode)) {
      return {
        ok: false,
        state: "expired",
        statusCode,
      };
    }

    return {
      ok: false,
      state: "failed",
      statusCode,
      message:
        statusCode === null
          ? "The Web Push request failed."
          : `The push service returned HTTP ${statusCode}.`,
    };
  }
}

export async function sendWebPushBatch(
  subscriptions: WebPushSubscriptionInput[],
  payload: WebPushNotificationPayload,
  options: WebPushSendOptions = {},
): Promise<WebPushBatchResult> {
  const deliveries = await Promise.all(
    subscriptions.map(async (subscription) => ({
      subscription,
      result: await sendWebPushNotification(
        subscription,
        payload,
        options,
      ),
    })),
  );

  const expiredSubscriptionIds: string[] = [];
  const failures: WebPushBatchFailure[] = [];

  let delivered = 0;
  let expired = 0;
  let failed = 0;

  for (const delivery of deliveries) {
    const { subscription, result } = delivery;

    if (result.ok) {
      delivered += 1;
      continue;
    }

    if (result.state === "expired") {
      expired += 1;

      if (subscription.id) {
        expiredSubscriptionIds.push(
          subscription.id,
        );
      }

      continue;
    }

    failed += 1;

    failures.push({
      subscriptionId: subscription.id ?? null,
      statusCode: result.statusCode,
    });
  }

  return {
    total: subscriptions.length,
    delivered,
    expired,
    failed,
    expiredSubscriptionIds,
    failures,
  };
}
