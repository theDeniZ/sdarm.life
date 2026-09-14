import type { MiddlewareHandler } from 'hono';
import type { Bindings } from '../types';

/**
 * Rate-limits the `/api/v1/llm/*` and `/llms.txt` agent endpoints using the
 * Workers Rate Limiting binding (`LLM_RATE_LIMITER`), not the KV-backed
 * `rateLimit()` in `rate-limit.ts`. That helper writes a KV key on every
 * request, and AI crawlers can be frequent enough to burn a meaningful share
 * of the free plan's 1,000 KV writes/day for traffic that is otherwise plain
 * reads (see docs/gotchas.md). The Rate Limiting binding counts inside the
 * Workers runtime itself and costs no KV write.
 *
 * The binding is optional (`LLM_RATE_LIMITER?: RateLimit` in types.ts) — an
 * environment without it (e.g. local dev, where the binding is not
 * simulated) passes every request through rather than failing.
 */
export const llmRateLimit: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
  const limiter = c.env.LLM_RATE_LIMITER;
  if (!limiter) {
    await next();
    return;
  }

  const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For')?.split(',')[0].trim() ?? 'unknown';
  const { success } = await limiter.limit({ key: ip });
  if (!success) {
    return c.text(
      'Too many requests. These endpoints are cached for up to a day — please slow down and re-fetch less often.',
      429,
      { 'Retry-After': '60' },
    );
  }

  await next();
};
