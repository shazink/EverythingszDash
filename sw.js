const CACHE_NAME = 'evdash-cache-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', event => {
  const reqUrl = new URL(event.request.url);

  // If the request includes a query string like ?title=... meaning it's a share target,
  // we want to serve the base index file but keep the query parameters intact so our app.js can intercept them.
  if (event.request.url.includes('?share_target=true') || event.request.url.includes('?url=')) {
    event.respondWith(
      caches.match('/index.html').then(response => {
        return response || fetch(event.request);
      })
    );
    return;
  }

  // Keep core assets fresh (helps avoid "I can't see the changes" when SW has cached old files).
  if (reqUrl.pathname === '/' || reqUrl.pathname === '/index.html' || reqUrl.pathname === '/app.js' || reqUrl.pathname === '/style.css') {
    event.respondWith(
      fetch(event.request)
        .then(async response => {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).catch(() => {
          // Fallback structure could go here if offline
        });
      })
  );
});
