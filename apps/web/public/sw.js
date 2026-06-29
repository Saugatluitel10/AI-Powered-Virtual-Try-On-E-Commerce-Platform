const CACHE_NAME = "vtryon-v2";
const STATIC_ASSETS = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];
const API_CACHE = "vtryon-api-v2";
const IMAGE_CACHE = "vtryon-images-v2";
const MAX_CACHED_IMAGES = 200;
const MAX_CACHED_API = 100;

const DB_NAME = "vtryon-offline";
const DB_VERSION = 1;
const CATALOG_STORE = "catalog";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CATALOG_STORE)) {
        db.createObjectStore(CATALOG_STORE, { keyPath: "url" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveToDB(url, data) {
  try {
    const db = await openDB();
    const tx = db.transaction(CATALOG_STORE, "readwrite");
    tx.objectStore(CATALOG_STORE).put({ url, data, savedAt: Date.now() });
    await new Promise((r, e) => { tx.oncomplete = r; tx.onerror = e; });
  } catch {}
}

async function getFromDB(url) {
  try {
    const db = await openDB();
    const tx = db.transaction(CATALOG_STORE, "readonly");
    const req = tx.objectStore(CATALOG_STORE).get(url);
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result?.data ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keepCaches = new Set([CACHE_NAME, API_CACHE, IMAGE_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keepCaches.has(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/v1/products") && request.method === "GET") {
    event.respondWith(staleWhileRevalidateWithDB(request, API_CACHE, MAX_CACHED_API));
    return;
  }

  if (
    request.destination === "image" ||
    url.hostname === "res.cloudinary.com" ||
    url.hostname.endsWith(".supabase.co")
  ) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, MAX_CACHED_IMAGES));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/") || new Response("Offline", { status: 503 }))
    );
    return;
  }
});

async function staleWhileRevalidateWithDB(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await trimCache(cache, maxEntries);
        await cache.put(request, response.clone());
        const data = await response.clone().json();
        await saveToDB(request.url, data);
      }
      return response;
    })
    .catch(() => null);

  if (cached) return cached;

  const networkResult = await fetchPromise;
  if (networkResult) return networkResult;

  const dbData = await getFromDB(request.url);
  if (dbData) {
    return new Response(JSON.stringify(dbData), {
      status: 200,
      headers: { "Content-Type": "application/json", "X-Served-From": "indexeddb" },
    });
  }

  return new Response('{"error":"Offline"}', {
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

self.addEventListener("message", (event) => {
  if (event.data?.type === "RETRY_UPLOADS") {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: "TRIGGER_UPLOAD_RETRY" });
      });
    });
  }
});
