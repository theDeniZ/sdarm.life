/* Offline for the Sabbath Bible Lesson — and for nothing else.
 *
 * The worker is served from the root, so its scope covers the whole of
 * Schätze. That is deliberate: the lesson lives at /{locale}/sbl and a worker
 * parked deeper could never control it. What keeps the rest of the site out of
 * its way is the fetch handler: anything that is not the lesson, its data or a
 * hashed build asset is left alone entirely — no respondWith, no cache, the
 * browser does what it always did.
 *
 * Every box is capped. The worker file itself does not change from one deploy
 * to the next, so `activate` — the only place a cache can be dropped wholesale
 * — fires roughly once in the life of the installation, while each deploy adds
 * a fresh set of hashed chunks on top of the last. Left uncapped that is a
 * cache that only ever grows on a reader's device. The Cache API returns keys
 * in insertion order, so the oldest go first.
 */
const SHELL = 'sbl-shell-v1';
const ASSETS = 'sbl-assets-v1';
const QUARTERS = 'sbl-quarters-v1';
const BIBLES = 'sbl-bibles-v1';
const KEEP = [SHELL, ASSETS, QUARTERS, BIBLES];

/* A build's worth of chunks for this route is well under a hundred; the room
   above that is what lets the previous deploy stay readable offline while the
   new one is being picked up. Quarters are ~250 KB, so two years of browsing
   costs a couple of megabytes. An edition is four, which is why that box is the
   one counted in single figures. */
const CAP = { [ASSETS]: 160, [QUARTERS]: 24, [BIBLES]: 6, [SHELL]: 8 };

self.addEventListener('install', (e) => e.waitUntil(self.skipWaiting()));

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => (KEEP.includes(k) ? null : caches.delete(k)))))
      .then(() => self.clients.claim())
  );
});

/* Any locale, not a list of the two that exist today: the list would be in a
   file nobody thinks to grep, and a third locale would silently lose offline. */
const isLesson = (url) => /^\/[a-z]{2}\/sbl\/?$/.test(url.pathname);

async function trim(box, cache) {
  const max = CAP[box];
  if (!max) return;
  const keys = await cache.keys();
  if (keys.length <= max) return;
  await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

/* Never throws. A `put` can fail — the origin quota is full, the user is in a
   private window — and `cacheFirst` awaits this before it answers the page: a
   rejection here would turn a failed *cache write* into a failed *request*, and
   the reader would get a broken asset instead of an uncached one. */
async function keep(box, req, res) {
  try {
    const c = await caches.open(box);
    await c.put(req, res);
    await trim(box, c);
  } catch {
    /* nothing to do: the page carries on without the cache */
  }
}

function cacheFirst(req, box) {
  return caches.open(box).then(async (c) => {
    const hit = await c.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res && res.ok) await keep(box, req, res.clone());
    return res;
  });
}

function staleWhileRevalidate(req, box) {
  return caches.open(box).then(async (c) => {
    const hit = await c.match(req);
    const net = fetch(req)
      .then((res) => {
        if (res && res.ok) keep(box, req, res.clone());
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
  if (url.pathname.includes('/api/v1/sbl/bible/')) return e.respondWith(cacheFirst(req, BIBLES));
  if (url.pathname.includes('/api/v1/sbl/quarter/')) return e.respondWith(staleWhileRevalidate(req, QUARTERS));

  if (url.origin !== self.location.origin) return;

  /* hashed build assets: the URL changes when the file does */
  if (url.pathname.startsWith('/_next/static/')) return e.respondWith(cacheFirst(req, ASSETS));

  /* the sheet itself: fresh when there is a network, from the cache when not */
  if (isLesson(url)) {
    return e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) keep(SHELL, req, res.clone());
          return res;
        })
        .catch(() => caches.match(req))
    );
  }

  /* everything else in Schätze is none of this worker's business */
});
