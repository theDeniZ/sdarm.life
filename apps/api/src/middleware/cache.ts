import type { MiddlewareHandler } from 'hono';
import type { Bindings } from '../types';

export function cached(ttl: number): MiddlewareHandler<{ Bindings: Bindings }> {
  return async (c, next) => {
    if (c.req.method !== 'GET') {
      await next();
      return;
    }

    const cache = caches.default;
    const cacheKey = new Request(c.req.url, { method: 'GET' });

    const hit = await cache.match(cacheKey);
    if (hit) return new Response(hit.body, hit);

    await next();

    if (c.res.status === 200) {
      const response = c.res.clone();
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', `public, max-age=${ttl}`);
      const cacheable = new Response(response.body, {
        status: response.status,
        headers,
      });
      c.executionCtx.waitUntil(cache.put(cacheKey, cacheable));
    }
  };
}

/**
 * Purge specific cache URLs globally.
 *
 * Uses Cloudflare's Purge by URL API when CF_ZONE_ID + CF_PURGE_TOKEN are set
 * (purges across ALL edge colos). Falls back to per-colo caches.default.delete().
 */
export function purgeCache(ctx: ExecutionContext, origin: string, paths: string[], env?: Bindings): void {
  const urls = paths.map((path) => `${origin}${path}`);

  const zoneId = env?.CF_ZONE_ID;
  const purgeToken = env?.CF_PURGE_TOKEN;

  if (zoneId && purgeToken) {
    // Global purge via Cloudflare API — clears all edge colos
    ctx.waitUntil(
      fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${purgeToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: urls }),
      }),
    );
  } else {
    // Fallback: per-colo purge (only clears the edge handling this request)
    const cache = caches.default;
    ctx.waitUntil(Promise.all(urls.map((url) => cache.delete(new Request(url, { method: 'GET' })))));
  }
}
