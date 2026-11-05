/* ============================================================
   NW Class Service Worker (Phase 1)
   策略：
     - HTML/JSON：Network First（確保即時更新，離線時回退快取）
     - 靜態資源（CSS/JS/IMG）：Cache First
   ============================================================ */
const CACHE = 'nw-class-v1';
const CORE = [
  './',
  './index.html',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 網路優先：HTML 與同來源文件
  if (req.mode === 'navigate' || url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match('./index.html'))
        )
    );
    return;
  }

  // 快取優先：CDN 靜態資源
  e.respondWith(
    caches.match(req).then((r) =>
      r ||
      fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
    )
  );
});
