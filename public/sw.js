// Minimal service worker, install-only. No caching strategy on purpose --
// this app is not offline-first (that's separate, later work). Its only
// job is to satisfy the stricter PWA installability check some browsers
// still apply (a registered SW with a fetch handler), without changing how
// any request behaves.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
