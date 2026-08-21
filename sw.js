// Field Provisions — service worker
//
// What this does: lets the app be "installed" properly (home screen icon,
// no browser address bar, works if the connection drops briefly) by caching
// the app shell (this HTML/CSS/JS file, the manifest, the icons).
//
// What this deliberately does NOT do: cache anything from Supabase or any
// other external API. Vendor listings, quote requests, reviews — all of
// that must always come from the network, live. This service worker only
// helps the app itself load instantly and survive a flaky connection; it
// is not a substitute for a real internet connection to actually use the
// app's data.
//
// Bump CACHE_NAME any time you want to force everyone's cached copy to be
// thrown out and re-fetched (e.g. after a big index.html update).
const CACHE_NAME = 'field-provisions-shell-v1';

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png',
  './favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only ever handle GET requests for our own site's files. Everything
  // else (Supabase API calls, Resend, CDN scripts, POST/PATCH/DELETE
  // requests) passes straight through to the network, untouched — the
  // service worker doesn't intercept them at all.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Network-first for the page itself, so signed-in users always see the
  // latest version when they have a connection; falls back to the cached
  // shell only if the network request fails (offline, or a flaky signal).
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache-first for static assets (icons, manifest) — these rarely change,
  // so serve instantly from cache and only hit the network on a cache miss.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
