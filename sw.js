const CACHE_NAME = 'evdash-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // If the request includes a query string like ?title=... meaning it's a share target,
  // we want to serve the base index file but keep the query parameters intact so our app.js can intercept them.
  if (event.request.url.includes('?share_target=true') || event.request.url.includes('?url=')) {
    event.respondWith(
      caches.match('./index.html').then(response => {
        return response || fetch(event.request);
      })
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
