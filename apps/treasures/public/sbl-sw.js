/* Offline for the Sabbath Bible Lesson — and for nothing else.
 *
 * The worker is served from the root, so its scope covers the whole of
 * Schätze. That is deliberate: the lesson lives at /{locale}/sbl and a worker
 * parked deeper could never control it. What keeps the rest of the site out of
 * its way is the fetch handler: anything that is not the lesson, its data or a
 * hashed build asset is left alone entirely — no respondWith, no cache, the
 * browser does what it always did.
 */
const SHELL = 'sbl-shell-v1';
const DATA = 'sbl-data-v1';

self.addEventListener('install', (e) => e.waitUntil(self.skipWaiting()));

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => (k === SHELL || k === DATA ? null : caches.delete(k)))))
      .then(() => self.clients.claim())
  );
});

const isLesson = (url) => /\/(de|en)\/sbl\/?$/.test(url.pathname);

function cacheFirst(req, box) {
  return caches.open(box).then(async (c) => {
    const hit = await c.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res && res.ok) c.put(req, res.clone());
    return res;
  });
}

function staleWhileRevalidate(req) {
  return caches.open(DATA).then(async (c) => {
    const hit = await c.match(req);
    const net = fetch(req)
      .then((res) => {
        if (res && res.ok) c.put(req, res.clone());
        return res;
      })
      .catch(() => hit);
    return hit || net;
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* an edition never changes; a quarter occasionally does */
  if (url.pathname.includes('/api/v1/sbl/bible/')) return e.respondWith(cacheFirst(req, DATA));
  if (url.pathname.includes('/api/v1/sbl/quarter/')) return e.respondWith(staleWhileRevalidate(req));

  if (url.origin !== self.location.origin) return;

  /* hashed build assets: the URL changes when the file does */
  if (url.pathname.startsWith('/_next/static/')) return e.respondWith(cacheFirst(req, DATA));

  /* the sheet itself: fresh when there is a network, from the cache when not */
  if (isLesson(url)) {
    return e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
  }

  /* everything else in Schätze is none of this worker's business */
});
