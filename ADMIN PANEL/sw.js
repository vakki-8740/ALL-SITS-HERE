const CACHE = 'admin-panel-v4';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './LOGO/FASICON.jpg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

const REMOTE = ['firebase', 'gstatic', 'fontawesome', 'cdnjs'];

self.addEventListener('fetch', e => {
  const req = e.request;

  // Remote CDN libs are version-pinned: cache-first.
  if (REMOTE.some(x => req.url.includes(x))) {
    e.respondWith(
      caches.match(req).then(r => r || fetch(req).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(req, clone)).catch(() => {});
        return resp;
      }))
    );
    return;
  }

  // Firestore / Telegram / Telegram API use POST - Cache API only accepts GET.
  if (req.method !== 'GET') return;

  // Local files: network-first so new code is picked up immediately,
  // cache fallback keeps the panel working offline.
  e.respondWith(
    fetch(req).then(resp => {
      if (resp && resp.ok) {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(req, clone)).catch(() => {});
      }
      return resp;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
