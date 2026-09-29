import type { MiddlewareHandler } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../types';
import { recordSongOpen } from '../repositories/songs';

// Crawlers would otherwise rank their own behaviour: on a sampled day SemrushBot
// alone was 73 % of all requests to apps/treasures (docs/frontend.md).
const AUTOMATED_UA = /bot|crawler|spider|headless/i;

/** True for user agents that identify as automated. The value is read, never stored. */
export function isAutomatedUserAgent(ua: string | undefined): boolean {
	return AUTOMATED_UA.test(ua ?? '');
}

/**
 * Counts one open per successful `GET /songs/{id}` (issue #197).
 *
 * This is a middleware mounted *in front of* `cached()` in index.ts, not a line
 * in the route handler: `/songs/*` is edge-cached for an hour, and a cache hit
 * returns before the handler runs, so a handler-level counter would record at
 * most one open per song per hour per colo. Here the response status is known
 * on a hit and on a miss alike — only 200s are cached, and 200 means the song
 * exists, so a 404 is never counted.
 *
 * The write goes through `waitUntil`: it never delays or fails the response,
 * and a failed write is logged, not surfaced.
 */
export const countSongOpen: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
	// Read before next(): c.req.param() resolves against the route that ran last,
	// and on a cache hit that is cached()'s `/songs/*`, which has no `id`.
	const songId = Number(c.req.param('id'));
	await next();
	if (c.req.method !== 'GET' || c.res.status !== 200 || !Number.isInteger(songId)) return;
	if (isAutomatedUserAgent(c.req.header('User-Agent'))) return;

	c.executionCtx.waitUntil(recordSongOpen(drizzle(c.env.DB), songId).catch((err) => console.error('recordSongOpen failed', err)));
};
