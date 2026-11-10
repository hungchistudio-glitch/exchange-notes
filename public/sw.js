// Bumped whenever offline.html changes: the page is cached once, at install,
// so an installed app keeps the old one until the worker itself changes.
const CACHE_NAME = "exchange-notes-v5";
const OFFLINE_URL = "/offline.html";
const CORE_ASSETS = [OFFLINE_URL];
const SAFE_ASSET_PREFIXES = ["/_next/static/", "/brand/", "/audio/", "/shop-thumbs/"];

/*
 * The camera's on-device runtime (public/mediapipe), answered from the
 * device first. lib/vision/onDeviceClassifier.ts downloads it into this
 * cache once; before 2026-11-10 it came from the network on every visit,
 * 11.7MB served `max-age=0`. Named for the @mediapipe/tasks-vision version,
 * because its file names never change: tests/onDeviceVisionCache.test.ts
 * keeps the three in step.
 */
const VISION_RUNTIME_CACHE = "exchange-notes-vision-runtime-1.0.1";
const VISION_RUNTIME_PREFIX = "/mediapipe/";

/* =========================================================
   Opening without a network (Chi, 2026-11-10: "直接進 App")

   Until now this worker never kept a page, and with no signal the app was
   only offline.html — although the words, reviews, notes and the last news
   were all on the phone, in IndexedDB, waiting for a screen to show them.

   Now the signed-in app's pages are kept as they are visited, and the main
   tabs ahead of time on a good signal (OfflinePageKeeper). A page asked for
   is still fetched from the network first; only when the network has not
   answered in five seconds (the wait Chi chose for a weak signal) or has
   failed does the kept copy open instead, and the network's answer, if it
   comes, replaces the copy for next time.

   The reason pages were never kept is still true: they hold account data.
   So only the signed-in app's own routes are kept — never the landing page,
   /login or /api — only a 200 that was not redirected, never an error
   screen, and everything here is deleted on sign-out with the rest of the
   device's copies (lib/offline/forgetDevice.ts).
   ========================================================= */
const PAGE_CACHE = "exchange-notes-pages-v1";
const PAGE_WAIT_MS = 5000;
/* Every folder of app/(protected); tests/serviceWorkerFetch.test.ts compares. */
const APP_PAGE_ROOTS = [
  "/capture",
  "/discover",
  "/friends",
  "/games",
  "/hangyumi",
  "/home",
  "/invitations",
  "/messages",
  "/notes",
  "/profile",
  "/pronunciation",
  "/review",
  "/scanner",
  "/shop",
  "/vocabulary",
  "/wordvault",
];
/* app/error.tsx marks its screen with this; a page that rendered it is not kept. */
const ROUTE_ERROR_MARK = "data-route-error";
/* Which build the kept pages were last refreshed for. */
const KEPT_BUILD_KEY = "/__exchange-notes/kept-build";
const KEPT_BUILD_HEADER = "x-exchange-notes-build";
/* Old build assets nothing kept refers to any more are dropped after this. */
const ASSET_KEEP_MS = 7 * 24 * 60 * 60 * 1000;

/*
 * Once a request has waited out PAGE_WAIT_MS, the next pages for a while
 * open from their kept copy at once (and still refresh it in the
 * background): a tab change on a weak signal would otherwise wait twice,
 * once for its payload and again for the page it fell back to.
 */
const WEAK_HOLD_MS = 20000;
let weakUntil = 0;

function noteSlow() {
  weakUntil = Date.now() + WEAK_HOLD_MS;
}

function isAppPage(url) {
  return APP_PAGE_ROOTS.some(
    (root) => url.pathname === root || url.pathname.startsWith(`${root}/`)
  );
}

function pageKey(url) {
  return `${url.origin}${url.pathname}`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function offlineFallback() {
  const offlinePage = await caches.match(OFFLINE_URL);
  if (offlinePage) return offlinePage;

  return new Response("Exchange Notes is offline.", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/* A signed-in page as the server sent it: a plain 200 of HTML, not redirected. */
function keepable(response) {
  return (
    response.status === 200 &&
    response.type === "basic" &&
    !response.redirected &&
    (response.headers.get("content-type") || "").includes("text/html")
  );
}

async function keptBuild() {
  try {
    const cache = await caches.open(PAGE_CACHE);
    const stamp = await cache.match(KEPT_BUILD_KEY);
    return stamp ? await stamp.text() : "";
  } catch {
    return "";
  }
}

/*
 * Stores a page under its path. The body is read here, so it is stored
 * decoded, without the encoding headers of the original, and so an error
 * screen can be recognised and left out.
 */
async function storePage(key, response, build) {
  try {
    const html = await response.text();
    if (html.includes(ROUTE_ERROR_MARK)) return null;

    const cache = await caches.open(PAGE_CACHE);
    await cache.put(
      key,
      new Response(html, {
        status: 200,
        headers: {
          "Content-Type": response.headers.get("content-type") || "text/html; charset=utf-8",
          Date: response.headers.get("date") || new Date().toUTCString(),
          [KEPT_BUILD_HEADER]: build,
        },
      })
    );
    return html;
  } catch {
    // A quota or storage error costs the offline copy, nothing else.
    return null;
  }
}

async function pageCopy(key) {
  try {
    const cache = await caches.open(PAGE_CACHE);
    return (await cache.match(key)) || null;
  } catch {
    return null;
  }
}

async function appPage(event, request, url) {
  const key = pageKey(url);
  let keeping = Promise.resolve();

  const network = fetch(request).then((response) => {
    if (keepable(response)) {
      const copy = response.clone();
      keeping = keptBuild().then((build) => storePage(key, copy, build));
    }
    return response;
  });
  event.waitUntil(network.then(() => keeping, () => undefined));

  // The network's answer if it comes in time; null if it failed outright.
  const wait = Date.now() < weakUntil ? 0 : PAGE_WAIT_MS;
  const answered = await Promise.race([
    network.catch(() => null),
    delay(wait).then(() => undefined),
  ]);
  if (answered === undefined && wait > 0) noteSlow();
  // A server error with a kept page to show instead is not worth showing.
  if (answered && answered.status < 500) return answered;

  const copy = await pageCopy(key);
  if (copy) return copy;
  if (answered) return answered;

  // Nothing kept for this page: wait for the network after all.
  if (answered === null) return offlineFallback();
  return network.catch(offlineFallback);
}

/*
 * A tab change asks for the page's RSC payload rather than its HTML. When
 * that is slow and a kept page exists, failing it is the fastest way there:
 * Next then falls back to a browser navigation, which appPage answers from
 * the kept copy. Without a kept page there is nowhere faster to go, so the
 * request is left to finish. Prefetches are never failed: they are not
 * waited on by anyone.
 */
async function rscOrKeptPage(request, url) {
  const network = fetch(request);
  const answered = await Promise.race([
    network.catch(() => null),
    delay(PAGE_WAIT_MS).then(() => undefined),
  ]);
  if (answered) return answered;
  if (answered === undefined) {
    noteSlow();
    if (!(await pageCopy(pageKey(url)))) return network;
  }
  return Response.error();
}

const ASSET_PATTERN = /\/_next\/static\/[A-Za-z0-9_\-.~/]+/g;

function assetsIn(html) {
  return new Set(html.match(ASSET_PATTERN) || []);
}

/* What a kept page needs to start without a network: its build's files. */
async function keepAssets(paths) {
  const cache = await caches.open(CACHE_NAME);
  for (const path of paths) {
    try {
      if (await cache.match(path)) continue;
      const response = await fetch(path);
      if (response.status === 200) await cache.put(path, response);
    } catch {
      // The page fetches it itself the next time it opens online.
    }
  }
}

/*
 * Every build has new file names, so without this the cache only grew: three
 * builds a day, each leaving its files behind. Once kept pages move to a new
 * build, files no kept page refers to and older than a week are dropped. A
 * week, because a phone can stay on an old build for days.
 */
async function pruneAssets(referenced) {
  const cache = await caches.open(CACHE_NAME);
  const now = Date.now();
  for (const request of await cache.keys()) {
    const path = new URL(request.url).pathname;
    if (!path.startsWith("/_next/static/") || referenced.has(path)) continue;
    const response = await cache.match(request);
    const date = Date.parse((response && response.headers.get("date")) || "");
    if (Number.isFinite(date) && now - date > ASSET_KEEP_MS) await cache.delete(request);
  }
}

/*
 * Keeps the given pages for this build: fetched now, with whatever files
 * they start from. Asked for by components/foundation/OfflinePageKeeper.tsx,
 * only on a good signal.
 */
async function keepPages(paths, build) {
  const cache = await caches.open(PAGE_CACHE);
  const newBuild = (await keptBuild()) !== build;

  for (const path of paths) {
    const url = new URL(path, self.location.origin);
    if (url.origin !== self.location.origin || !isAppPage(url)) continue;

    const key = pageKey(url);
    const kept = await cache.match(key);
    if (kept && kept.headers.get(KEPT_BUILD_HEADER) === build) continue;

    try {
      // Manual, so a signed-out answer (a redirect to /login) is never kept.
      const response = await fetch(url.pathname, { credentials: "same-origin", redirect: "manual" });
      if (!keepable(response)) continue;
      const html = await storePage(key, response, build);
      if (html) await keepAssets(assetsIn(html));
    } catch {
      // No network after all: the next good signal tries again.
    }
  }

  if (!newBuild) return;
  await cache.put(KEPT_BUILD_KEY, new Response(build));

  const referenced = new Set();
  for (const request of await cache.keys()) {
    if (new URL(request.url).pathname === KEPT_BUILD_KEY) continue;
    const response = await cache.match(request);
    if (!response) continue;
    for (const asset of assetsIn(await response.text())) referenced.add(asset);
  }
  await pruneAssets(referenced);
}

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "keep-pages" || !Array.isArray(data.pages)) return;
  const build = typeof data.build === "string" ? data.build : "";
  event.waitUntil(keepPages(data.pages.slice(0, 20), build).catch(() => {}));
});

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
          // The camera's on-device model (lib/vision/onDeviceClassifier.ts)
          // lives in its own cache so a release does not throw 4.5MB away;
          // the shop's device-rendered pictures (lib/yumi3d/thumbnails.ts)
          // likewise, and are versioned by their own key; and the kept pages
          // are what opens the app with no signal. The camera's runtime is
          // kept only for the current MediaPipe version.
          .filter(
            (key) =>
              key !== CACHE_NAME &&
              key !== PAGE_CACHE &&
              !(key.startsWith("exchange-notes-vision") &&
                (!key.startsWith("exchange-notes-vision-runtime-") || key === VISION_RUNTIME_CACHE)) &&
              !key.startsWith("exchange-notes-shop")
          )
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

  // API routes can contain account data and are never kept; their callers
  // keep what they need in IndexedDB.
  if (url.pathname.startsWith("/api/")) return;

  /*
   * Range requests are left entirely alone.
   *
   * This is how a media element asks for audio — the opening sound and every
   * zhuyin clip — and it produces a 206. The Cache API refuses to store a
   * partial response, so `cache.put` below rejected on every one of them:
   * "Failed to execute 'put' on 'Cache': Partial response (status code 206)
   * is unsupported", uncaught, once per request.
   *
   * Not caught and moved on from, but skipped altogether. Answering a ranged
   * media request through respondWith means this worker is now responsible
   * for range semantics it does not implement — and the fallback below can
   * hand a cached 200 to a request that asked for bytes 45000-45620, which a
   * media element is entitled to reject. Returning nothing here lets the
   * browser do what it already does correctly.
   */
  if (request.headers.has("range")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      isAppPage(url)
        ? appPage(event, request, url)
        : fetch(request).catch(offlineFallback)
    );
    return;
  }

  // A tab change's payload; never stored, only failed over to a kept page.
  if (request.headers.get("rsc") === "1") {
    if (isAppPage(url) && !request.headers.has("next-router-prefetch")) {
      event.respondWith(rscOrKeptPage(request, url));
    }
    return;
  }

  if (url.pathname.startsWith(VISION_RUNTIME_PREFIX)) {
    event.respondWith(
      caches.open(VISION_RUNTIME_CACHE).then(async (cache) => {
        const kept = await cache.match(request);
        if (kept) return kept;
        const response = await fetch(request);
        if (response.status === 200) {
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      })
    );
    return;
  }

  if (!SAFE_ASSET_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        // `response.ok` includes 206, which the Cache API cannot store.
        if (response.status === 200) {
          const clone = response.clone();

          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, clone))
            .catch(() => {
              // A quota or storage error must never become console noise.
            });
        }

        return response;
      });
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
