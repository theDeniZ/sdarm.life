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
 * Purge specific cache URLs. Call from admin mutation handlers.
 */
export function purgeCache(ctx: ExecutionContext, origin: string, paths: string[]): void {
  const cache = caches.default;
  ctx.waitUntil(
    Promise.all(paths.map((path) => cache.delete(new Request(`${origin}${path}`, { method: 'GET' })))),
  );
}
