/**
 * Per-user rate limiter backed by Cloudflare KV.
 *
 * Window:  1 minute (sliding, keyed by UTC minute)
 * Limit:   configurable via env var RATE_LIMIT_PER_MIN (default 20)
 * KV key:  rl:{userId}:{minuteIndex}   (TTL = 120 s — covers current + next minute)
 *
 * Why KV and not in-memory?
 * Cloudflare Workers run in multiple isolates globally. An in-memory counter
 * would be local to each isolate and allow far more than the intended limit.
 * KV is eventually consistent but good enough for abuse prevention.
 */

export const DEFAULT_RATE_LIMIT_PER_MINUTE = 20;

export async function isRateLimited(kv: KVNamespace, userId: number, limit: number): Promise<boolean> {
  const minute = Math.floor(Date.now() / 60_000);
  const key = `rl:${userId}:${minute}`;

  const raw = await kv.get(key);
  const count = raw !== null ? parseInt(raw, 10) : 0;

  if (count >= limit) return true;

  // Increment; TTL of 120 s ensures the key is cleaned up after the window passes.
  await kv.put(key, String(count + 1), { expirationTtl: 120 });
  return false;
}
