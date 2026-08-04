const SUBSCRIPTION_API_PATH = "/api/push/subscription";

type StandaloneNavigator = Navigator & {
  standalone?: boolean;
};

type JsonRecord = Record<string, unknown>;

export type WebPushAvailabilityCode =
  | "available"
  | "server-rendering"
  | "needs-home-screen"
  | "unsupported"
  | "misconfigured";

export type WebPushFailureCode =
  | "needs-home-screen"
  | "unsupported"
  | "misconfigured"
  | "permission-denied"
  | "permission-dismissed"
  | "authentication-required"
  | "subscription-failed"
  | "server-error"
  | "unsubscribe-failed";

export type WebPushAvailability = {
  code: WebPushAvailabilityCode;
  available: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  permission: NotificationPermission | "unavailable";
};

export type WebPushStatus = WebPushAvailability & {
  subscribed: boolean;
};

export type EnableWebPushResult =
  | {
      ok: true;
      state: "subscribed";
      created: boolean;
    }
  | {
      ok: false;
      code: WebPushFailureCode;
      message: string;
    };

export type DisableWebPushResult =
  | {
      ok: true;
      state: "unsubscribed" | "not-subscribed";
    }
  | {
      ok: false;
      code: WebPushFailureCode;
      message: string;
    };

type SubscriptionPayload = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceName: string | null;
};

type WebPushEnvironment =
  | {
      ready: true;
      publicKey: string;
      availability: WebPushAvailability;
    }
  | {
      ready: false;
      availability: WebPushAvailability;
    };

class WebPushActionError extends Error {
  readonly code: WebPushFailureCode;

  constructor(code: WebPushFailureCode, message: string) {
    super(message);
    this.name = "WebPushActionError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function detectIOS(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent.toLowerCase();

  const classicIOS =
    userAgent.includes("iphone") ||
    userAgent.includes("ipad") ||
    userAgent.includes("ipod");

  const desktopModeIPad =
    navigator.platform === "MacIntel" &&
    navigator.maxTouchPoints > 1;

  return classicIOS || desktopModeIPad;
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const displayModeStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches === true;

  const iosStandalone =
    (navigator as StandaloneNavigator).standalone === true;

  return displayModeStandalone || iosStandalone;
}

function inspectWebPushEnvironment(): WebPushEnvironment {
  if (
    typeof window === "undefined" ||
    typeof navigator === "undefined"
  ) {
    return {
      ready: false,
      availability: {
        code: "server-rendering",
        available: false,
        isIOS: false,
        isStandalone: false,
        permission: "unavailable",
      },
    };
  }

  const isIOS = detectIOS();
  const isStandalone = detectStandalone();

  if (isIOS && !isStandalone) {
    return {
      ready: false,
      availability: {
        code: "needs-home-screen",
        available: false,
        isIOS,
        isStandalone,
        permission:
          "Notification" in window
            ? Notification.permission
            : "unavailable",
      },
    };
  }

  const supportsRequiredAPIs =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  if (!supportsRequiredAPIs) {
    return {
      ready: false,
      availability: {
        code: "unsupported",
        available: false,
        isIOS,
        isStandalone,
        permission:
          "Notification" in window
            ? Notification.permission
            : "unavailable",
      },
    };
  }

  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();

  if (!publicKey) {
    return {
      ready: false,
      availability: {
        code: "misconfigured",
        available: false,
        isIOS,
        isStandalone,
        permission: Notification.permission,
      },
    };
  }

  return {
    ready: true,
    publicKey,
    availability: {
      code: "available",
      available: true,
      isIOS,
      isStandalone,
      permission: Notification.permission,
    },
  };
}

function decodeVapidPublicKey(value: string): ArrayBuffer {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const paddingLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized.padEnd(
    normalized.length + paddingLength,
    "="
  );

  let decoded: string;

  try {
    decoded = window.atob(padded);
  } catch {
    throw new WebPushActionError(
      "misconfigured",
      "The public VAPID key is invalid."
    );
  }

  if (decoded.length === 0) {
    throw new WebPushActionError(
      "misconfigured",
      "The public VAPID key is empty."
    );
  }

  const bytes = Uint8Array.from(
    decoded,
    (character) => character.charCodeAt(0)
  );

  return bytes.buffer;
}

function arrayBuffersEqual(
  left: ArrayBuffer | null,
  right: ArrayBuffer
): boolean {
  if (!left || left.byteLength !== right.byteLength) {
    return false;
  }

  const leftBytes = new Uint8Array(left);
  const rightBytes = new Uint8Array(right);

  for (let index = 0; index < leftBytes.length; index += 1) {
    if (leftBytes[index] !== rightBytes[index]) {
      return false;
    }
  }

  return true;
}

function getSubscriptionPayload(
  subscription: PushSubscription,
  deviceName: string | null
): SubscriptionPayload {
  const serialized = subscription.toJSON();
  const p256dh = serialized.keys?.p256dh;
  const auth = serialized.keys?.auth;

  if (!p256dh || !auth) {
    throw new WebPushActionError(
      "subscription-failed",
      "The browser did not provide complete push encryption keys."
    );
  }

  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    keys: {
      p256dh,
      auth,
    },
    deviceName,
  };
}

function normalizeDeviceName(
  deviceName: string | null | undefined
): string | null {
  if (typeof deviceName !== "string") {
    return null;
  }

  const normalized = deviceName.trim();

  return normalized.length > 0
    ? normalized.slice(0, 120)
    : null;
}

async function readApiBody(
  response: Response
): Promise<JsonRecord> {
  try {
    const value: unknown = await response.json();

    return isRecord(value) ? value : {};
  } catch {
    return {};
  }
}

function apiErrorMessage(
  body: JsonRecord,
  fallback: string
): string {
  return typeof body.error === "string" && body.error.trim()
    ? body.error
    : fallback;
}

async function registerSubscriptionOnServer(
  payload: SubscriptionPayload
): Promise<void> {
  const response = await fetch(SUBSCRIPTION_API_PATH, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await readApiBody(response);

  if (response.status === 401) {
    throw new WebPushActionError(
      "authentication-required",
      "You must be signed in before enabling notifications."
    );
  }

  if (!response.ok || body.ok !== true) {
    throw new WebPushActionError(
      "server-error",
      apiErrorMessage(
        body,
        "The push subscription could not be saved."
      )
    );
  }
}

async function disableSubscriptionOnServer(
  endpoint: string
): Promise<void> {
  const response = await fetch(SUBSCRIPTION_API_PATH, {
    method: "DELETE",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      endpoint,
    }),
  });

  const body = await readApiBody(response);

  if (response.status === 401) {
    throw new WebPushActionError(
      "authentication-required",
      "You must be signed in before disabling notifications."
    );
  }

  if (!response.ok || body.ok !== true) {
    throw new WebPushActionError(
      "server-error",
      apiErrorMessage(
        body,
        "The push subscription could not be disabled."
      )
    );
  }
}

function toFailureResult(
  error: unknown,
  fallbackCode: WebPushFailureCode,
  fallbackMessage: string
): {
  ok: false;
  code: WebPushFailureCode;
  message: string;
} {
  if (error instanceof WebPushActionError) {
    return {
      ok: false,
      code: error.code,
      message: error.message,
    };
  }

  return {
    ok: false,
    code: fallbackCode,
    message:
      error instanceof Error && error.message
        ? error.message
        : fallbackMessage,
  };
}

function environmentFailure(
  environment: WebPushEnvironment
): {
  ok: false;
  code: WebPushFailureCode;
  message: string;
} {
  switch (environment.availability.code) {
    case "needs-home-screen":
      return {
        ok: false,
        code: "needs-home-screen",
        message:
          "On iPhone or iPad, add Exchange Notes to the Home Screen and open it from there first.",
      };

    case "misconfigured":
      return {
        ok: false,
        code: "misconfigured",
        message:
          "The public VAPID key is not configured.",
      };

    default:
      return {
        ok: false,
        code: "unsupported",
        message:
          "This browser does not support Web Push notifications.",
      };
  }
}

export function getWebPushAvailability(): WebPushAvailability {
  return inspectWebPushEnvironment().availability;
}

export async function getWebPushStatus(): Promise<WebPushStatus> {
  const environment = inspectWebPushEnvironment();

  if (!environment.ready) {
    return {
      ...environment.availability,
      subscribed: false,
    };
  }

  try {
    const registration =
      await navigator.serviceWorker.ready;

    const subscription =
      await registration.pushManager.getSubscription();

    return {
      ...environment.availability,
      permission: Notification.permission,
      subscribed: subscription !== null,
    };
  } catch {
    return {
      ...environment.availability,
      permission: Notification.permission,
      subscribed: false,
    };
  }
}

/**
 * Must be called directly from a user action, such as clicking an
 * "Enable notifications" button. Browsers may reject permission requests
 * that are triggered automatically or outside a user gesture.
 */
export async function enableWebPush(
  deviceName?: string | null
): Promise<EnableWebPushResult> {
  const environment = inspectWebPushEnvironment();

  if (!environment.ready) {
    return environmentFailure(environment);
  }

  if (Notification.permission === "denied") {
    return {
      ok: false,
      code: "permission-denied",
      message:
        "Notification permission is blocked in the browser or device settings.",
    };
  }

  if (Notification.permission === "default") {
    let permission: NotificationPermission;

    try {
      permission = await Notification.requestPermission();
    } catch (error) {
      return toFailureResult(
        error,
        "subscription-failed",
        "Notification permission could not be requested."
      );
    }

    if (permission === "denied") {
      return {
        ok: false,
        code: "permission-denied",
        message:
          "Notification permission was denied.",
      };
    }

    if (permission !== "granted") {
      return {
        ok: false,
        code: "permission-dismissed",
        message:
          "Notification permission was not granted.",
      };
    }
  }

  let subscription: PushSubscription | null = null;
  let created = false;

  try {
    const applicationServerKey =
      decodeVapidPublicKey(environment.publicKey);

    const registration =
      await navigator.serviceWorker.ready;

    subscription =
      await registration.pushManager.getSubscription();

    if (
      subscription &&
      !arrayBuffersEqual(
        subscription.options.applicationServerKey,
        applicationServerKey
      )
    ) {
      await subscription.unsubscribe();
      subscription = null;
    }

    if (!subscription) {
      subscription =
        await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });

      created = true;
    }

    const payload = getSubscriptionPayload(
      subscription,
      normalizeDeviceName(deviceName)
    );

    try {
      await registerSubscriptionOnServer(payload);
    } catch (error) {
      if (created) {
        await subscription.unsubscribe().catch(() => false);
      }

      throw error;
    }

    return {
      ok: true,
      state: "subscribed",
      created,
    };
  } catch (error) {
    return toFailureResult(
      error,
      "subscription-failed",
      "Push notifications could not be enabled."
    );
  }
}

export async function disableWebPush(): Promise<DisableWebPushResult> {
  const environment = inspectWebPushEnvironment();

  if (!environment.ready) {
    return environmentFailure(environment);
  }

  try {
    const registration =
      await navigator.serviceWorker.ready;

    const subscription =
      await registration.pushManager.getSubscription();

    if (!subscription) {
      return {
        ok: true,
        state: "not-subscribed",
      };
    }

    await disableSubscriptionOnServer(
      subscription.endpoint
    );

    const unsubscribed = await subscription.unsubscribe();

    if (!unsubscribed) {
      return {
        ok: false,
        code: "unsubscribe-failed",
        message:
          "The browser could not remove the push subscription.",
      };
    }

    return {
      ok: true,
      state: "unsubscribed",
    };
  } catch (error) {
    return toFailureResult(
      error,
      "unsubscribe-failed",
      "Push notifications could not be disabled."
    );
  }
}
