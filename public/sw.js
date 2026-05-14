const CACHE_NAME = "rj-finance-v2";
const APP_SHELL = [
  "/",
  "/login",
  "/offline.html",
  "/manifest.webmanifest",
  "/rumah-jengkar-logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

const STATIC_ASSET_EXTENSIONS = [
  ".css",
  ".js",
  ".mjs",
  ".png",
  ".svg",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".woff",
  ".woff2",
  ".ttf",
  ".ico",
  ".json",
];

function isStaticAssetRequest(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    APP_SHELL.includes(url.pathname) ||
    STATIC_ASSET_EXTENSIONS.some((extension) => url.pathname.endsWith(extension))
  );
}

function isDynamicAppRequest(request, url) {
  return (
    request.mode === "navigate" ||
    url.pathname.startsWith("/api/") ||
    request.headers.has("rsc") ||
    request.headers.has("next-router-state-tree") ||
    request.headers.has("next-router-prefetch") ||
    request.headers.has("next-router-segment-prefetch") ||
    request.headers.has("x-nextjs-data") ||
    url.searchParams.has("_rsc")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (isDynamicAppRequest(request, requestUrl)) {
    event.respondWith(
      fetch(request).catch(() =>
        request.mode === "navigate" ? caches.match("/offline.html") : Promise.reject(),
      ),
    );
    return;
  }

  if (!isStaticAssetRequest(requestUrl)) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
            return networkResponse;
          }

          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return networkResponse;
        })
        .catch(() => caches.match("/icons/icon-192.png"));
    }),
  );
});
