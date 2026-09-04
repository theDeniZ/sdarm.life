import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache';

/**
 * This app does not use ISR, but it does rely on Next's Data Cache: the Bible
 * pages fetch chapters and book lists with `next: { revalidate }` (see
 * `app/lib/bible.ts`).
 *
 * `staticAssetsIncrementalCache` — the obvious choice for an app without ISR —
 * cannot serve that. It is read-only: every attempted Data Cache write logs
 * `Failed to set to read-only cache … type=fetch` and drops the entry, so every
 * request re-fetched everything and one crawled chapter page cost five billed
 * Worker requests. In one sampled day that produced 28,000 error lines against
 * 5,000 requests — a ratio of exactly the number of fetches per render.
 *
 * R2 gives those writes somewhere to go. Bucket reads and writes are R2
 * operations, not Worker requests, so a cache hit costs nothing against the
 * Workers quota. `withRegionalCache` puts the colo's own cache in front of the
 * bucket so repeat views in the same region usually do not reach R2 either.
 */
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: 'long-lived' }),
});
