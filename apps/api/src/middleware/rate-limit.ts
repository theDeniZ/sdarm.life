import type { MiddlewareHandler } from 'hono';
import type { Bindings } from '../types';

/**
 * IP-based rate-limiting middleware backed by Workers KV.
 *
 * Uses CF-Connecting-IP (real IP, set by Cloudflare) as the key.
 * TTL is 120 s so the key is cleaned up after the 1-minute window passes.
 *
 * @param prefix     Short prefix to namespace KV keys (e.g. 'sub', 'br')
 * @param maxPerMin  Max requests per IP per minute before returning 429
 */
export function rateLimit(prefix: string, maxPerMin: number): MiddlewareHandler<{ Bindings: Bindings }> {
  return async (c, next) => {
    const ip =
      c.req.header('CF-Connecting-IP') ??
      c.req.header('X-Forwarded-For')?.split(',')[0].trim() ??
      'unknown';

    const minute = Math.floor(Date.now() / 60_000);
    const key = `rl:${prefix}:${ip}:${minute}`;

    let count = 0;
    try {
      const raw = await c.env.KV.get(key);
      count = raw !== null ? parseInt(raw, 10) : 0;
    } catch {
      // KV read failure → fail open (let request through rather than breaking the endpoint)
    }

    if (count >= maxPerMin) {
      return c.json({ error: 'Too many requests. Please try again later.' }, 429);
    }

    try {
      await c.env.KV.put(key, String(count + 1), { expirationTtl: 120 });
    } catch {
      // KV write failure → non-fatal, let request through
    }

    return next();
  };
}
