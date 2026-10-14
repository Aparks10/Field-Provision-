// sw.js — Service Worker for Field Provisions
//
// Strategy: only handle requests for OUR OWN site files (index.html, icons, etc).
// Anything going to another domain — Supabase (login, vendors, quote requests),
// Stripe, fonts, CDNs — is left completely alone so the browser handles it normally.
// (An earlier version cached those too, which could serve stale/failed data and
// cause "failed to fetch" errors on login.)

const CACHE_NAME = "field-provisions-v2";

const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Add one at a time so a single missing file can't break installation.
      Promise.all(CORE_ASSETS.map((url) => cache.add(url).catch(() => null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Leave every other domain (Supabase, Stripe, CDNs) to the browser.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        // Offline navigation: fall back to the app shell.
        if (req.mode === "navigate") {
          const shell = await caches.match("/index.html") || await caches.match("/");
          if (shell) return shell;
        }
        return Response.error();
      })
  );
});
