/* Cafe HR kiosk service worker. Plain JS — served from /sw.js. */
/* eslint-disable no-restricted-globals */

const CACHE_NAME = "cafe-hr-kiosk-v1";
const PRECACHE_URLS = [
  "/kiosk",
  "/brand/logo-192.png",
  "/brand/logo-96.png",
  "/brand/logo-48.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("cafe-hr-kiosk-") && k !== CACHE_NAME)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isKioskNavigation(request, url) {
  if (request.mode === "navigate") {
    return url.pathname === "/kiosk" || url.pathname.startsWith("/kiosk/");
  }
  return false;
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/brand/") || url.pathname.startsWith("/assets/")
  );
}

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isApiRequest(url)) {
    // Network-only: never cache mutations or fresh data
    return;
  }

  if (isKioskNavigation(request, url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, copy))
            .catch(() => {});
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached ||
              caches.match("/kiosk").then(
                (fallback) =>
                  fallback ||
                  new Response("Offline", {
                    status: 503,
                    headers: { "content-type": "text/plain; charset=utf-8" },
                  }),
              ),
          ),
        ),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, copy))
              .catch(() => {});
            return response;
          }),
      ),
    );
    return;
  }

  // Otherwise: pass through to network (default behavior)
});
