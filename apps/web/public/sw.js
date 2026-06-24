const CACHE_NAME = "vtryon-v1";
const STATIC_ASSETS = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];
const API_CACHE = "vtryon-api-v1";
const IMAGE_CACHE = "vtryon-images-v1";
const MAX_CACHED_IMAGES = 200;
const MAX_CACHED_API = 100;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE && k !== IMAGE_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Product list & detail API — stale-while-revalidate
  if (url.pathname.startsWith("/api/v1/products") && request.method === "GET") {
    event.respondWith(staleWhileRevalidate(request, API_CACHE, MAX_CACHED_API));
    return;
  }

  // Product images — cache-first
  if (
    request.destination === "image" ||
    url.hostname === "res.cloudinary.com" ||
    url.hostname.endsWith(".supabase.co")
  ) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, MAX_CACHED_IMAGES));
    return;
  }

  // Navigation — network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/") || new Response("Offline", { status: 503 }))
    );
    return;
  }
});

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await trimCache(cache, maxEntries);
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || new Response('{"error":"Offline"}', {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      await trimCache(cache, maxEntries);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("", { status: 503 });
  }
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length >= maxEntries) {
    await cache.delete(keys[0]);
  }
}
