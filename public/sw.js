const CACHE_NAME = "news-feed-v3";

// App shell files to cache on install
const APP_SHELL = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  // Take control immediately without waiting for old SW to be replaced
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Remove old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Network-first for API calls — always get fresh data
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => new Response("", { status: 503 }))
    );
    return;
  }

  // Network-first for navigation (HTML page loads) — ensures fresh index.html after deploys
  // Falls back to cached index.html if offline
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/index.html").then((cached) => cached ?? new Response("", { status: 503 }))
      )
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, fonts, images)
  // Falls back to network if not cached
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Only cache successful responses for same-origin requests
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
