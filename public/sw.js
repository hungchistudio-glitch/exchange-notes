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
