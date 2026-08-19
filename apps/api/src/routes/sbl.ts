import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Bindings } from '../types';

/* The Sabbath Bible Lesson and the Bible editions it quotes, proxied from the
 * church's own source, app.sdarm.org.
 *
 * The reason this route exists at all is docs/dsgvo.md: the SBL page used to
 * fetch both files straight from the browser, which handed every reader's IP
 * to a third party on page load. Fetched here, app.sdarm.org sees our Worker
 * asking for a quarter — nothing about the reader.
 *
 * Nothing is stored and nothing is rewritten: the upstream JSON is passed
 * through byte for byte, exactly as the lesson engine in `apps/treasures`
 * expects to parse it.
 */

const router = new OpenAPIHono<{ Bindings: Bindings }>();

const UPSTREAM = 'https://app.sdarm.org';

/* app.sdarm.org answers 406 to anything whose User-Agent looks like a tool —
 * "curl/8.x" is refused, a name and an address are not. Same header the
 * geocode proxy identifies itself with. */
const UA = 'sdarm.life-sbl (info@sdarm.life)';

/** A quarter is about 250 KB; an edition about four megabytes. Neither is
 *  worth holding in KV — the edge cache is where a whole-file proxy belongs,
 *  and the reader's own service worker keeps the last copy after that. */
const QUARTER_TTL = 60 * 60 * 6; // 6 h — a quarter is edited, rarely and late
const BIBLE_TTL = 60 * 60 * 24 * 30; // 30 days — an edition does not change

/* Upstream's own status is what the caller gets, not a blanket 404.
 *
 * Flattening every failure to "no such quarter" hid the two cases that matter
 * and look nothing alike from here: app.sdarm.org being down or rate-limiting
 * us (5xx, 429 — try again, this quarter exists) versus a quarter that really
 * is not published yet (404 — do not). Only the second is worth telling a
 * reader about, and only the first is worth an operator looking at a log.
 *
 * A 4xx other than 404 is upstream refusing us rather than missing the file —
 * the 406 the WAF answers a tool-shaped User-Agent with is exactly that — and
 * it is reported as 502, because it is our request that is wrong, not the
 * reader's. Nothing here is cacheable: `cached()` stores 200s only. */
async function proxy(url: string, ttl: number): Promise<Response> {
	let upstream: Response;
	try {
		upstream = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
	} catch (err) {
		console.error('[sbl] upstream unreachable', url, err);
		return Response.json({ error: 'The lesson service could not be reached.' }, { status: 502 });
	}

	if (!upstream.ok) {
		if (upstream.status !== 404) console.error('[sbl] upstream failed', url, upstream.status, upstream.statusText);
		const status = upstream.status === 404 ? 404 : upstream.status >= 500 || upstream.status === 429 ? 503 : 502;
		return Response.json(
			{ error: status === 404 ? 'Not found' : 'The lesson service is unavailable.', upstream: upstream.status },
			{ status },
		);
	}

	return new Response(upstream.body, {
		status: 200,
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': `public, max-age=${ttl}`,
		},
	});
}

const LessonQuarterSchema = z
	.object({
		title: z.string().optional(),
		lang: z.string().optional(),
		year: z.number().optional(),
		quarter: z.number().optional(),
		lessons: z.array(z.unknown()).optional(),
	})
	.passthrough()
	.openapi('SblQuarter');

const BibleEditionSchema = z
	.object({
		id: z.string().optional(),
		name: z.string().optional(),
		lang: z.string().optional(),
		books: z.record(z.string(), z.unknown()).optional(),
	})
	.passthrough()
	.openapi('SblBibleEdition');

const quarterRoute = createRoute({
	method: 'get',
	path: '/quarter/{lang}/{year}/{quarter}',
	tags: ['SBL'],
	request: {
		params: z.object({
			lang: z.enum(['de', 'en', 'ru']),
			year: z.coerce.number().int().min(2000).max(2100),
			quarter: z.coerce.number().int().min(1).max(4),
		}),
	},
	responses: {
		200: {
			content: { 'application/json': { schema: LessonQuarterSchema } },
			description: 'One quarter of lessons, as app.sdarm.org publishes it (13 lessons, Sunday to Sabbath)',
		},
		400: { description: 'Invalid language, year or quarter' },
		404: { description: 'No such quarter upstream — it is not published yet' },
		502: { description: 'app.sdarm.org refused the request or could not be reached' },
		503: { description: 'app.sdarm.org is erroring or rate-limiting — the quarter may well exist' },
	},
});

router.openapi(quarterRoute, async (c) => {
	const { lang, year, quarter } = c.req.valid('param');
	return proxy(`${UPSTREAM}/sbl/data/${lang}/${lang}-${year}-${quarter}.json`, QUARTER_TTL);
});

const bibleRoute = createRoute({
	method: 'get',
	path: '/bible/{version}',
	tags: ['SBL'],
	request: {
		params: z.object({
			/* the edition ids app.sdarm.org serves: "de-lut", "en-kjv", "es-rvr1960" */
			version: z.string().regex(/^[a-z]{2}-[a-z0-9]+$/),
		}),
	},
	responses: {
		200: {
			content: { 'application/json': { schema: BibleEditionSchema } },
			description: 'A whole Bible edition: book code → chapters → verses. About four megabytes.',
		},
		400: { description: 'Invalid edition id' },
		404: { description: 'No such edition upstream' },
		502: { description: 'app.sdarm.org refused the request or could not be reached' },
		503: { description: 'app.sdarm.org is erroring or rate-limiting' },
	},
});

router.openapi(bibleRoute, async (c) => {
	const { version } = c.req.valid('param');
	return proxy(`${UPSTREAM}/bible/data/${version}.json`, BIBLE_TTL);
});

export default router;
