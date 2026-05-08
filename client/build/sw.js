const CACHE = 'plugram-v1';
const files = ['/', '/index.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(files)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  if (e.request.url.startsWith('http')) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).catch(() => new Response('Offline', { status: 503 })))
    );
  }
});
