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
   tabs ahead of time on a good signal (OfflinePageKeeper), refreshed at most
   once a day or as soon as the reader's settings change (Chi: "每天最多一
   次", about half a megabyte each time). A page asked for is still fetched
   from the network first; only when the network has not answered in five
   seconds (the wait Chi chose for a weak signal) or has failed does the kept
   copy open instead, and the network's answer, if it comes, replaces the
   copy for next time.

   The reason pages were never kept is still true: they hold account data.
   So only the signed-in app's own routes are kept — never the landing page,
   /login or /api — only a 200 that was not redirected, never an error
   screen, and everything here is deleted on sign-out with the rest of the
   device's copies (lib/offline/forgetDevice.ts), including a page that was
   still on its way when the reader signed out (forgetPages).

   A kept copy is marked (KEPT_PAGE_META) because what the server rendered
   into it — the account's settings and learning language — may be older
   than the device's: the page then asks again rather than applying them.
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
  "/lookup",
  "/messages",
  "/notes",
  "/profile",
  "/pronunciation",
  "/review",
  "/scanner",
  "/shop",
  "/starweaver",
  "/vocabulary",
  "/wordvault",
];
/*
 * Pages whose server render reads the query string. Their copy is kept per
 * query: /invitations/new?word=a must never open on the copy made for
 * ?word=b. Every other page reads its query on the phone, so one copy per
 * path serves them all. tests/serviceWorkerFetch.test.ts compares.
 */
const QUERY_PAGES = [
  "/invitations/new",
  "/messages",
  "/messages/new",
];
/* app/error.tsx marks its screen with this; a page that rendered it is not kept. */
const ROUTE_ERROR_MARK = "data-route-error";
/* Put into every kept copy; hooks/useOnline.ts (isKeptPage) looks for it. */
const KEPT_PAGE_META = "exchange-notes-kept-page";
/* What the kept pages were rendered for: the reader's settings, from OfflinePageKeeper. */
const KEPT_FOR_KEY = "/__exchange-notes/kept-for";
/* When each build file was last used by a page, from OfflinePageKeeper. */
const ASSET_USE_KEY = "/__exchange-notes/asset-use";
const KEPT_FOR_HEADER = "x-exchange-notes-kept-for";
const KEPT_AT_HEADER = "x-exchange-notes-kept-at";
const DAY_MS = 24 * 60 * 60 * 1000;
/* A kept page is fetched again ahead of time at most this often. */
const KEEP_REFRESH_MS = DAY_MS;
/* A page neither opened nor refreshed for a week is dropped. */
const PAGE_KEEP_MS = 7 * DAY_MS;
/* And at most this many are kept, the most recent. */
const MAX_KEPT_PAGES = 40;
/* A build file on no kept page and unused for a month is dropped. */
const ASSET_KEEP_MS = 30 * DAY_MS;
/* A use is written down at most this often per file. */
const ASSET_USE_STEP_MS = 60 * 60 * 1000;

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

/*
 * Bumped on sign-out. A page fetched before it carries the account that
 * signed out, so whatever was on its way then is not stored after.
 */
let keptEpoch = 0;
const storing = new Set();

function isAppPage(url) {
  return APP_PAGE_ROOTS.some(
    (root) => url.pathname === root || url.pathname.startsWith(`${root}/`)
  );
}

function pageKey(url) {
  if (!QUERY_PAGES.includes(url.pathname)) return `${url.origin}${url.pathname}`;
  const params = new URLSearchParams(url.search);
  params.delete("_rsc");
  params.sort();
  const query = params.toString();
  return `${url.origin}${url.pathname}${query ? `?${query}` : ""}`;
}

function isStamp(request) {
  return new URL(request.url).pathname.startsWith("/__exchange-notes/");
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

async function keptFor() {
  try {
    const cache = await caches.open(PAGE_CACHE);
    const stamp = await cache.match(KEPT_FOR_KEY);
    return stamp ? await stamp.text() : "";
  } catch {
    return "";
  }
}

function keptAt(response) {
  const at = Number(response.headers.get(KEPT_AT_HEADER));
  return Number.isFinite(at) && at > 0 ? at : Date.parse(response.headers.get("date") || "");
}

/* The copy says it is one, at the top of its head. */
function markKept(html, at) {
  const meta = `<meta name="${KEPT_PAGE_META}" content="${new Date(at).toISOString()}">`;
  const head = /<head(\s[^>]*)?>/i.exec(html);
  if (head) {
    const end = head.index + head[0].length;
    return html.slice(0, end) + meta + html.slice(end);
  }
  const root = /<html(\s[^>]*)?>/i.exec(html);
  if (root) {
    const end = root.index + root[0].length;
    return `${html.slice(0, end)}<head>${meta}</head>${html.slice(end)}`;
  }
  return html;
}

/*
 * Stores a page under its key. The body is read here, so it is stored
 * decoded, without the encoding headers of the original, and so an error
 * screen can be recognised and left out. Returns the page as the server
 * sent it, or null when nothing was stored.
 */
function storePage(key, response, renderedFor, epoch) {
  const work = (async () => {
    try {
      const html = await response.text();
      if (html.includes(ROUTE_ERROR_MARK) || epoch !== keptEpoch) return null;

      const now = Date.now();
      const cache = await caches.open(PAGE_CACHE);
      if (epoch !== keptEpoch) return null;
      await cache.put(
        key,
        new Response(markKept(html, now), {
          status: 200,
          headers: {
            "Content-Type": response.headers.get("content-type") || "text/html; charset=utf-8",
            Date: response.headers.get("date") || new Date(now).toUTCString(),
            [KEPT_FOR_HEADER]: renderedFor,
            [KEPT_AT_HEADER]: String(now),
          },
        })
      );
      return html;
    } catch {
      // A quota or storage error costs the offline copy, nothing else.
      return null;
    }
  })();
  storing.add(work);
  work.then(() => storing.delete(work));
  return work;
}

/* Sign-out: nothing on its way is stored, and what is kept goes. */
async function forgetPages() {
  keptEpoch += 1;
  await Promise.all([...storing]);
  await caches.delete(PAGE_CACHE);
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
  const epoch = keptEpoch;
  let keeping = Promise.resolve();

  /*
   * Kept under its path only when opened without a query: a page's server
   * render can carry its query in the props it hands the page (a widget's
   * action on /vocabulary, say), and the copy would replay it on every
   * later opening. The QUERY_PAGES are kept per query instead.
   */
  const storable = url.search === "" || QUERY_PAGES.includes(url.pathname);
  const network = fetch(request).then((response) => {
    if (storable && keepable(response)) {
      const copy = response.clone();
      keeping = keptFor().then((renderedFor) => storePage(key, copy, renderedFor, epoch));
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

async function readAssetUse(cache) {
  try {
    const stamp = await cache.match(ASSET_USE_KEY);
    const use = stamp ? await stamp.json() : null;
    return use && typeof use === "object" && !Array.isArray(use) ? use : {};
  } catch {
    return {};
  }
}

/*
 * Writes down which build files the page has been using, including the
 * ones it loads on demand (Yumi's scene, the camera), which no page's HTML
 * names: without this, pruning could not tell them from an old build's.
 */
async function noteAssetUse(cache, paths, now) {
  if (paths.length === 0) return;
  const use = await readAssetUse(cache);
  let changed = false;
  for (const path of paths) {
    if (now - (use[path] || 0) < ASSET_USE_STEP_MS) continue;
    use[path] = now;
    changed = true;
  }
  if (!changed) return;
  for (const path of Object.keys(use)) {
    if (now - use[path] > ASSET_KEEP_MS) delete use[path];
  }
  await cache.put(ASSET_USE_KEY, new Response(JSON.stringify(use), {
    headers: { "Content-Type": "application/json" },
  }));
}

/*
 * The most recent MAX_KEPT_PAGES pages opened or refreshed within the week
 * stay; the rest go. Returns the pages that stayed.
 */
async function prunePages(cache, now) {
  const pages = [];
  for (const request of await cache.keys()) {
    if (isStamp(request)) continue;
    const response = await cache.match(request);
    const at = response ? keptAt(response) : NaN;
    if (!response || !Number.isFinite(at) || now - at > PAGE_KEEP_MS) {
      await cache.delete(request);
      continue;
    }
    pages.push({ request, at });
  }
  pages.sort((a, b) => b.at - a.at);
  for (const { request } of pages.slice(MAX_KEPT_PAGES)) await cache.delete(request);
  return pages.slice(0, MAX_KEPT_PAGES).map(({ request }) => request);
}

/*
 * Every build has new file names, so without this the cache only grew: three
 * builds a day, each leaving its files behind. A file no kept page refers to
 * and no page has used for a month is dropped.
 */
async function pruneAssets(referenced, use, now) {
  const cache = await caches.open(CACHE_NAME);
  for (const request of await cache.keys()) {
    const path = new URL(request.url).pathname;
    if (!path.startsWith("/_next/static/") || referenced.has(path)) continue;
    let last = use[path];
    if (!last) {
      const response = await cache.match(request);
      last = Date.parse((response && response.headers.get("date")) || "");
    }
    if (Number.isFinite(last) && now - last > ASSET_KEEP_MS) await cache.delete(request);
  }
}

/*
 * Keeps the given pages: fetched now, with whatever files they start from,
 * unless already kept within the day for the same settings. Asked for by
 * components/foundation/OfflinePageKeeper.tsx, only on a good signal.
 */
async function keepPages(paths, renderedFor, used) {
  const epoch = keptEpoch;
  const now = Date.now();
  const cache = await caches.open(PAGE_CACHE);
  if ((await keptFor()) !== renderedFor) await cache.put(KEPT_FOR_KEY, new Response(renderedFor));
  await noteAssetUse(cache, used, now);

  let changed = false;
  for (const path of paths) {
    if (epoch !== keptEpoch) return;
    const url = new URL(path, self.location.origin);
    if (url.origin !== self.location.origin || !isAppPage(url)) continue;

    const key = pageKey(url);
    const kept = await cache.match(key);
    if (
      kept &&
      kept.headers.get(KEPT_FOR_HEADER) === renderedFor &&
      now - keptAt(kept) < KEEP_REFRESH_MS
    ) {
      continue;
    }

    try {
      // Manual, so a signed-out answer (a redirect to /login) is never kept.
      const response = await fetch(url.pathname + url.search, { credentials: "same-origin", redirect: "manual" });
      if (!keepable(response)) continue;
      const html = await storePage(key, response, renderedFor, epoch);
      if (!html) continue;
      changed = true;
      await keepAssets(assetsIn(html));
    } catch {
      // No network after all: the next good signal tries again.
    }
  }

  if (!changed || epoch !== keptEpoch) return;

  const referenced = new Set();
  for (const request of await prunePages(cache, now)) {
    const response = await cache.match(request);
    if (!response) continue;
    for (const asset of assetsIn(await response.text())) referenced.add(asset);
  }
  await pruneAssets(referenced, await readAssetUse(cache), now);
}

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === "forget-pages") {
    event.waitUntil(forgetPages().catch(() => {}));
    return;
  }

  if (data.type !== "keep-pages" || !Array.isArray(data.pages)) return;
  const renderedFor = typeof data.keptFor === "string" ? data.keptFor.slice(0, 500) : "";
  const used = Array.isArray(data.used)
    ? data.used.filter((path) => typeof path === "string" && path.startsWith("/_next/static/")).slice(0, 500)
    : [];
  event.waitUntil(keepPages(data.pages.slice(0, 20), renderedFor, used).catch(() => {}));
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
