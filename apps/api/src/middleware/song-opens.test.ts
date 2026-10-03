import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { Bindings } from '../types';
import { countSongOpen, isAutomatedUserAgent } from './song-opens';

// No real D1 (see docs/testing.md — the test D1 has no migrations applied). The
// fake binding records the statements drizzle prepares, so these tests pin what
// the middleware sends and when — one in-place upsert per counted open, nothing
// for a 404 or a crawler — without asserting anything about a table. That the
// upsert creates the row and then increments it is SQLite behaviour; it was
// verified end to end against a local D1 (docs/api.md).

type Statement = { sql: string; params: unknown[] };

function fakeD1(opts: { fail?: boolean } = {}) {
	const statements: Statement[] = [];
	const DB = {
		prepare(sql: string) {
			const stmt = {
				params: [] as unknown[],
				bind(...params: unknown[]) {
					stmt.params = params;
					return stmt;
				},
				// Not `async`: a failure throws synchronously inside drizzle's own async
				// wrapper. An already-rejected promise handed back to it is reported by
				// the workers pool as an unhandled rejection even though the middleware
				// catches it.
				run() {
					if (opts.fail) throw new Error('D1 unavailable');
					statements.push({ sql, params: stmt.params });
					return Promise.resolve({ success: true, meta: {}, results: [] });
				},
			};
			return stmt;
		},
	};
	return { env: { DB } as unknown as Bindings, statements };
}

function testApp() {
	const app = new Hono<{ Bindings: Bindings }>();
	app.use('/songs/:id{[0-9]+}', countSongOpen);
	// Stands in for cached(): a hit answers here and never reaches the handler.
	app.use('/songs/*', async (c, next) => (c.req.header('X-Cache-Hit') ? c.json({ ok: true }) : next()));
	app.get('/songs/:id', (c) => (c.req.param('id') === '404' ? c.json({ error: 'Not found' }, 404) : c.json({ ok: true })));
	return app;
}

async function open(
	path: string,
	env: Bindings,
	ua = 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) Safari/605.1.15',
	extra: Record<string, string> = {},
) {
	const pending: Promise<unknown>[] = [];
	const ctx = { waitUntil: (p: Promise<unknown>) => pending.push(p), passThroughOnException: () => {}, props: {} };
	const init = { headers: { 'User-Agent': ua, ...extra } };
	const res = await testApp().request(path, init, env, ctx as unknown as ExecutionContext);
	await Promise.all(pending);
	return res;
}

describe('countSongOpen', () => {
	it('counts a found song with one in-place upsert', async () => {
		const { env, statements } = fakeD1();
		const res = await open('/songs/42', env);

		expect(res.status).toBe(200);
		expect(statements).toHaveLength(1);
		const [{ sql, params }] = statements;
		expect(sql).toMatch(/^insert into "song_opens"/i);
		// The increment happens inside the statement — not a read followed by a write.
		expect(sql).toMatch(/on conflict \(("song_opens"\.)?"song_id"\) do update set "opens" = "song_opens"\."opens" \+ 1/i);
		expect(params.slice(0, 2)).toEqual([42, 1]);
	});

	it('issues exactly one upsert per open', async () => {
		const { env, statements } = fakeD1();
		await open('/songs/7', env);
		await open('/songs/7', env);
		await open('/songs/8', env);
		expect(statements.map((s) => s.params[0])).toEqual([7, 7, 8]);
	});

	// The regression this middleware exists for: /songs/* is edge-cached, and a
	// counter that only ran on a miss would count one open per song per hour.
	it('counts a cache hit that never reaches the route handler', async () => {
		const { env, statements } = fakeD1();
		await open('/songs/42', env, undefined, { 'X-Cache-Hit': '1' });
		expect(statements.map((s) => s.params[0])).toEqual([42]);
	});

	it('does not count a 404', async () => {
		const { env, statements } = fakeD1();
		const res = await open('/songs/404', env);
		expect(res.status).toBe(404);
		expect(statements).toHaveLength(0);
	});

	it('skips automated user agents and never passes the UA to the database', async () => {
		const { env, statements } = fakeD1();
		await open('/songs/42', env, 'Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)');
		expect(statements).toHaveLength(0);

		const ua = 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/131.0 Safari/537.36';
		await open('/songs/42', env, ua);
		expect(statements).toHaveLength(1);
		expect(JSON.stringify(statements[0])).not.toContain('Chrome');
	});

	it('never fails the response when the counter write fails', async () => {
		const { env } = fakeD1({ fail: true });
		const res = await open('/songs/42', env);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
	});
});

describe('isAutomatedUserAgent', () => {
	it.each([
		'Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)',
		'Mozilla/5.0 (compatible; MJ12bot/v1.4.8; http://mj12bot.com/)',
		'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
		'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0 Safari/537.36',
		'Baiduspider+(+http://www.baidu.com/search/spider.htm)',
	])('flags %s', (ua) => {
		expect(isAutomatedUserAgent(ua)).toBe(true);
	});

	it.each([
		'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
		'',
		undefined,
	])('lets %s through', (ua) => {
		expect(isAutomatedUserAgent(ua)).toBe(false);
	});
});
