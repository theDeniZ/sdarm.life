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

async function proxy(url: string, ttl: number): Promise<Response> {
	const upstream = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
	if (!upstream.ok) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

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
		404: { description: 'No such quarter upstream' },
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
	},
});

router.openapi(bibleRoute, async (c) => {
	const { version } = c.req.valid('param');
	return proxy(`${UPSTREAM}/bible/data/${version}.json`, BIBLE_TTL);
});

export default router;
