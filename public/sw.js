const CACHE_NAME = "exchange-notes-v2";
// "/signup" was a dead legacy route (login only offers Google OAuth, no
// link anywhere in the app points at it) — replaced with "/onboarding",
// the real first-run route new accounts hit.
const CORE_ASSETS = ["/", "/login", "/onboarding"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Individual adds instead of cache.addAll(): addAll fails the whole
      // install if even one URL 404s/errors, which would leave the SW
      // permanently stuck reinstalling. A missing core asset shouldn't
      // block the rest from being cached.
      Promise.all(
        CORE_ASSETS.map((url) => cache.add(url).catch(() => {}))
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Same-origin only. Without this check the network-first handler below
  // was also intercepting and caching cross-origin requests — Supabase
  // REST/Realtime calls, Google avatar images, the dictionary API lookup —
  // none of which belong in this cache: they're either per-user data that
  // shouldn't be persisted client-side beyond Supabase's own handling, or
  // opaque cross-origin responses the Cache API can't usefully store.
  if (url.origin !== self.location.origin) return;

  // API routes are dynamic/personalized (pronunciation lookups, daily
  // news, classification, cron) — never worth serving stale from cache,
  // and some depend on request bodies the cache key ignores. Let these
  // hit the network normally, uncached.
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        // Offline navigation with nothing cached for this exact URL yet —
        // the app shell at "/" (precached on install) is a better failure
        // mode than a browser-native offline error page.
        if (request.mode === "navigate") {
          const shell = await caches.match("/");
          if (shell) return shell;
        }

        throw new Error("Network request failed and no cache entry exists.");
      })
  );
});

/* =========================================================
   Web Push notifications
   ========================================================= */

const DEFAULT_NOTIFICATION_TITLE = "Exchange Notes";
const DEFAULT_NOTIFICATION_BODY = "You have a new update.";
const DEFAULT_NOTIFICATION_URL = "/";
const DEFAULT_NOTIFICATION_ICON = "/icon";

function isPlainObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function normalizeNotificationString(value, maximumLength) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maximumLength);
}

function readPushPayload(event) {
  if (!event.data) {
    return {};
  }

  let text;

  try {
    text = event.data.text();
  } catch {
    return {};
  }

  if (!text) {
    return {};
  }

  try {
    const parsed = JSON.parse(text);

    if (isPlainObject(parsed)) {
      return parsed;
    }
  } catch {
    // Plain-text push messages remain valid and become the body.
  }

  return {
    body: text,
  };
}

function createSameOriginUrl(value, fallbackPath) {
  const fallbackUrl = new URL(
    fallbackPath,
    self.location.origin
  );

  if (typeof value !== "string" || !value.trim()) {
    return fallbackUrl.href;
  }

  try {
    const candidateUrl = new URL(
      value.trim(),
      self.location.origin
    );

    if (candidateUrl.origin !== self.location.origin) {
      return fallbackUrl.href;
    }

    return candidateUrl.href;
  } catch {
    return fallbackUrl.href;
  }
}

function normalizeBadgeCount(value) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    return null;
  }

  return Math.min(value, 9999);
}

function normalizePushNotification(payload) {
  const notification = isPlainObject(payload.notification)
    ? payload.notification
    : {};

  const originalData = isPlainObject(payload.data)
    ? payload.data
    : {};

  const title =
    normalizeNotificationString(
      notification.title ?? payload.title,
      120
    ) ?? DEFAULT_NOTIFICATION_TITLE;

  const body =
    normalizeNotificationString(
      notification.body ?? payload.body,
      240
    ) ?? DEFAULT_NOTIFICATION_BODY;

  const targetUrl = createSameOriginUrl(
    originalData.url ??
      originalData.path ??
      notification.url ??
      payload.url,
    DEFAULT_NOTIFICATION_URL
  );

  const icon = createSameOriginUrl(
    notification.icon ?? payload.icon,
    DEFAULT_NOTIFICATION_ICON
  );

  const badgeImage = createSameOriginUrl(
    notification.badge ?? payload.badge,
    DEFAULT_NOTIFICATION_ICON
  );

  const tag =
    normalizeNotificationString(
      notification.tag ?? payload.tag,
      120
    ) ?? undefined;

  const renotify =
    tag !== undefined &&
    (notification.renotify === true ||
      payload.renotify === true);

  const silent =
    notification.silent === true ||
    payload.silent === true;

  const badgeCount = normalizeBadgeCount(
    payload.badgeCount ??
      payload.appBadge ??
      originalData.badgeCount
  );

  return {
    title,
    badgeCount,
    options: {
      body,
      icon,
      badge: badgeImage,
      tag,
      renotify,
      silent,
      data: {
        ...originalData,
        url: targetUrl,
      },
    },
  };
}

async function updateApplicationBadge(badgeCount) {
  if (badgeCount === null) {
    return;
  }

  try {
    if (
      badgeCount === 0 &&
      typeof self.navigator.clearAppBadge === "function"
    ) {
      await self.navigator.clearAppBadge();
      return;
    }

    if (
      badgeCount > 0 &&
      typeof self.navigator.setAppBadge === "function"
    ) {
      await self.navigator.setAppBadge(badgeCount);
    }
  } catch {
    // Badging support and permission differ by platform.
    // Notification delivery must continue even when badging fails.
  }
}

function getNotificationTarget(notification) {
  const data = isPlainObject(notification.data)
    ? notification.data
    : {};

  return createSameOriginUrl(
    data.url ?? data.path,
    DEFAULT_NOTIFICATION_URL
  );
}

function isSameOriginClient(client) {
  try {
    return (
      new URL(client.url).origin === self.location.origin
    );
  } catch {
    return false;
  }
}

async function focusOrOpenNotificationTarget(targetUrl) {
  const windowClients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  const exactClient = windowClients.find(
    (client) => client.url === targetUrl
  );

  if (
    exactClient &&
    typeof exactClient.focus === "function"
  ) {
    return exactClient.focus();
  }

  const existingAppClient = windowClients.find(
    isSameOriginClient
  );

  if (existingAppClient) {
    let targetClient = existingAppClient;

    if (
      targetClient.url !== targetUrl &&
      typeof targetClient.navigate === "function"
    ) {
      try {
        const navigatedClient =
          await targetClient.navigate(targetUrl);

        if (navigatedClient) {
          targetClient = navigatedClient;
        }
      } catch {
        // Some platforms may reject navigation while waking the PWA.
        // Focusing the existing client is still preferable to failing.
      }
    }

    if (typeof targetClient.focus === "function") {
      return targetClient.focus();
    }
  }

  if (typeof self.clients.openWindow === "function") {
    return self.clients.openWindow(targetUrl);
  }

  return undefined;
}

self.addEventListener("push", (event) => {
  const payload = readPushPayload(event);
  const normalized = normalizePushNotification(payload);

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(
        normalized.title,
        normalized.options
      ),
      updateApplicationBadge(normalized.badgeCount),
    ])
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = getNotificationTarget(
    event.notification
  );

  event.waitUntil(
    focusOrOpenNotificationTarget(targetUrl)
  );
});
