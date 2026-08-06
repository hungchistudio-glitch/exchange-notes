import type {
  YumiWidgetUpdatePayload,
} from "@/lib/widget/yumiWidgetBridge";

const SNAPSHOT_ENDPOINT =
  "/api/scriptable/snapshot";

const SYNC_DEBOUNCE_MS = 350;
const SYNC_TIMEOUT_MS = 8_000;
const NEXT_REQUEST_DELAY_MS = 50;

const MAX_REQUEST_BYTES =
  90 * 1024;

type QueuedSnapshot = {
  body: string;
  fingerprint: string;
};

let queuedSnapshot:
  QueuedSnapshot | null = null;

let activeFingerprint:
  string | null = null;

let lastSuccessfulFingerprint:
  string | null = null;

let syncTimer:
  number | null = null;

let onlineListenerInstalled = false;

function canUseBrowserNetwork(): boolean {
  return (
    typeof window !== "undefined"
    && typeof fetch === "function"
  );
}

function isOffline(): boolean {
  return (
    typeof navigator !== "undefined"
    && navigator.onLine === false
  );
}

function clearSyncTimer() {
  if (
    typeof window === "undefined"
    || syncTimer === null
  ) {
    return;
  }

  window.clearTimeout(syncTimer);
  syncTimer = null;
}

function serializedByteLength(
  value: string,
): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder()
      .encode(value)
      .byteLength;
  }

  return value.length;
}

function serializeSnapshotRequest(
  payload: YumiWidgetUpdatePayload,
): string | null {
  try {
    const body = JSON.stringify({
      payload,
    });

    if (
      serializedByteLength(body)
      > MAX_REQUEST_BYTES
    ) {
      return null;
    }

    return body;
  } catch {
    return null;
  }
}

function installOnlineListener() {
  if (
    typeof window === "undefined"
    || onlineListenerInstalled
  ) {
    return;
  }

  window.addEventListener(
    "online",
    () => {
      scheduleSnapshotFlush(0);
    },
  );

  onlineListenerInstalled = true;
}

function scheduleSnapshotFlush(
  delay = SYNC_DEBOUNCE_MS,
) {
  if (
    !canUseBrowserNetwork()
    || !queuedSnapshot
    || activeFingerprint
    || syncTimer !== null
    || isOffline()
  ) {
    return;
  }

  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    void flushQueuedSnapshot();
  }, delay);
}

/**
 * Sends the latest queued snapshot to the authenticated same-origin endpoint.
 *
 * Requests are serialized so an older response can never finish after a
 * newer request and overwrite the latest snapshot.
 */
async function flushQueuedSnapshot():
  Promise<void> {
  if (
    !canUseBrowserNetwork()
    || activeFingerprint
    || !queuedSnapshot
    || isOffline()
  ) {
    return;
  }

  const request =
    queuedSnapshot;

  queuedSnapshot = null;
  activeFingerprint =
    request.fingerprint;

  const controller =
    new AbortController();

  const timeoutId =
    window.setTimeout(
      () => controller.abort(),
      SYNC_TIMEOUT_MS,
    );

  try {
    const response = await fetch(
      SNAPSHOT_ENDPOINT,
      {
        method: "PUT",
        credentials: "same-origin",
        cache: "no-store",
        keepalive: true,
        headers: {
          "Content-Type":
            "application/json",
        },
        body: request.body,
        signal: controller.signal,
      },
    );

    if (response.ok) {
      lastSuccessfulFingerprint =
        request.fingerprint;
    }
  } catch {
    // Scriptable synchronization is best-effort.
    // Native Widget delivery and the Home UI must never depend on it.
  } finally {
    window.clearTimeout(timeoutId);
    activeFingerprint = null;

    if (queuedSnapshot) {
      scheduleSnapshotFlush(
        NEXT_REQUEST_DELAY_MS,
      );
    }
  }
}

/**
 * Queues a best-effort Scriptable snapshot synchronization.
 *
 * The function never throws and does not alter native bridge delivery.
 */
export function queueScriptableYumiWidgetSnapshotSync(
  payload: YumiWidgetUpdatePayload,
): boolean {
  if (!canUseBrowserNetwork()) {
    return false;
  }

  try {
    installOnlineListener();

    const body =
      serializeSnapshotRequest(payload);

    if (!body) {
      return false;
    }

    const fingerprint = body;

    /*
     * The latest UI state has returned to the payload currently being sent.
     * Any different queued payload is now stale and must not be sent later.
     */
    if (
      activeFingerprint === fingerprint
    ) {
      queuedSnapshot = null;
      clearSyncTimer();

      return false;
    }

    /*
     * The server already has this exact payload and no request is currently
     * running. Any differently queued state is no longer the latest state.
     */
    if (
      activeFingerprint === null
      && lastSuccessfulFingerprint
        === fingerprint
    ) {
      queuedSnapshot = null;
      clearSyncTimer();

      return false;
    }

    if (
      queuedSnapshot?.fingerprint
      === fingerprint
    ) {
      return false;
    }

    queuedSnapshot = {
      body,
      fingerprint,
    };

    clearSyncTimer();
    scheduleSnapshotFlush();

    return true;
  } catch {
    return false;
  }
}
