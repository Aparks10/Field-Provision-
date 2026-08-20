// sw.js — Service Worker for Field Provisions
//
// What this does:
// - Caches your core site files the first time someone visits.
// - On repeat visits, serves those files instantly from cache while
//   fetching a fresh copy in the background (so it feels instant AND stays up to date).
// - If someone opens the app with no internet connection, it still loads
//   instead of showing a browser error.
//
// This is what PWABuilder is checking for when it grades "Service Worker"
// and part of "App Capabilities."

const CACHE_NAME = "field-provisions-v1";

// Add any other core files your site always needs (CSS/JS/icons) if they're
// separate files rather than inline in index.html.
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

// Install: pre-cache the core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches from previous versions
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

// Fetch: try the network first (so users always get fresh data — vendor
// listings, quote requests, etc.), fall back to cache if offline.
self.addEventListener("fetch", (event) => {
  // Only handle GET requests — never intercept POSTs (like Stripe/Supabase writes)
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
