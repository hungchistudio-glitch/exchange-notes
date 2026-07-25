/*
 * Exchange Notes Service Worker retirement build.
 *
 * This file intentionally unregisters the legacy service worker
 * and removes all Cache Storage entries created by older builds.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames.map((cacheName) =>
          caches.delete(cacheName)
        )
      );

      await self.registration.unregister();

      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      await Promise.all(
        clients.map((client) => {
          if ("navigate" in client) {
            return client.navigate(client.url);
          }

          return Promise.resolve();
        })
      );
    })()
  );
});
