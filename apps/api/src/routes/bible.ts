import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Bindings } from '../types';
import {
	BibleBookSchema,
	BibleBundleManifestSchema,
	BibleChapterSchema,
	BibleSearchHitSchema,
	BibleTranslationSchema,
	ErrorSchema,
	ParallelChapterSchema,
	listOf,
} from '../schemas';
import { cached } from '../middleware/cache';
import { getCacheGeneration } from '../services/bible/cache';
import * as catalog from '../services/bible/catalog';
import * as local from '../services/bible/local';
import { parseParallelCodes, projectorRefusals } from '../services/bible/parallel';

/**
 * Public Bible routes. Two sources sit behind this one contract — verses we
 * host ourselves (`services/bible/local.ts`, `sdarm-bible` D1) and the
 * YouVersion Platform API (`services/bible/youversion.ts`) — resolved by
 * `catalog.ts` from a translation's prefixed id, so nothing here needs to know
 * which source served a given translation.
 *
 * Edge caching is per-route rather than a blanket mount. The translation
 * endpoints are driven by the admin allowlist and stay uncached so enabling or
 * disabling a translation takes effect at once; they are cheap because the
 * underlying reads are themselves KV/D1-cheap. Scripture text never changes,
 * so books/chapters/parallel are cached at the edge for a day.
 *
 * `/search` and `/bundle` are also left uncached, for the same reason as the
 * translation endpoints: both read a license gate (`allowSearchIndex` /
 * `allowDownload` + `allowOffline`) that an operator can flip in Admin → Bible,
 * and a cached 403/200 would lag that change for up to a day.
 */
const router = new OpenAPIHono<{ Bindings: Bindings }>();

const NOT_FOUND = { error: 'Not found' } as const;
const ONE_DAY = 86400;
// Keyed by the cache generation, so a takedown or a license edit strands every
// stored chapter at once instead of leaving it served for up to a day.
const textCache = cached(ONE_DAY, { version: (c) => getCacheGeneration(c.env) });

const ProjectorUseQuery = z.enum(['projector']).optional().openapi({
	description:
		'Set to `projector` when the text is fetched for a shared screen. Every translation whose license has `allowProjector: false` is then refused with 403 — the strictest translation wins.',
});

router.openapi(
	createRoute({
		method: 'get',
		path: '/translations',
		tags: ['Bible'],
		responses: {
			200: {
				content: { 'application/json': { schema: listOf(BibleTranslationSchema) } },
				description: 'Translations enabled by the operator (empty when none are configured)',
			},
		},
	}),
	async (c) => {
		const items = await catalog.listTranslations(c.env);
		return c.json({ items, total: items.length }, 200);
	},
);

router.openapi(
	createRoute({
		method: 'get',
		path: '/translations/{code}',
		tags: ['Bible'],
		request: { params: z.object({ code: z.string() }) },
		responses: {
			200: { content: { 'application/json': { schema: BibleTranslationSchema } }, description: 'Translation metadata' },
			404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found or not enabled' },
		},
	}),
	async (c) => {
		const t = await catalog.resolveTranslation(c.env, c.req.valid('param').code);
		if (!t) return c.json(NOT_FOUND, 404);
		return c.json(t, 200);
	},
);

router.openapi(
	createRoute({
		method: 'get',
		path: '/translations/{code}/books',
		tags: ['Bible'],
		middleware: [textCache],
		request: { params: z.object({ code: z.string() }) },
		responses: {
			200: { content: { 'application/json': { schema: listOf(BibleBookSchema) } }, description: 'Books in canonical order' },
			404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found or not enabled' },
		},
	}),
	async (c) => {
		const t = await catalog.resolveTranslation(c.env, c.req.valid('param').code);
		if (!t) return c.json(NOT_FOUND, 404);
		const items = await catalog.listBooks(c.env, t);
		if (items.length === 0) return c.json(NOT_FOUND, 404);
		return c.json({ items, total: items.length }, 200);
	},
);

router.openapi(
	createRoute({
		method: 'get',
		path: '/translations/{code}/books/{bookCode}',
		tags: ['Bible'],
		middleware: [textCache],
		request: { params: z.object({ code: z.string(), bookCode: z.string() }) },
		responses: {
			200: { content: { 'application/json': { schema: BibleBookSchema } }, description: 'Book metadata' },
			404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
		},
	}),
	async (c) => {
		const { code, bookCode } = c.req.valid('param');
		const t = await catalog.resolveTranslation(c.env, code);
		if (!t) return c.json(NOT_FOUND, 404);
		const books = await catalog.listBooks(c.env, t);
		const book = books.find((b) => b.code === bookCode.toUpperCase());
		if (!book) return c.json(NOT_FOUND, 404);
		return c.json(book, 200);
	},
);

router.openapi(
	createRoute({
		method: 'get',
		path: '/translations/{code}/books/{bookCode}/chapters/{n}',
		tags: ['Bible'],
		middleware: [textCache],
		request: {
			params: z.object({ code: z.string(), bookCode: z.string(), n: z.coerce.number().int().positive() }),
			query: z.object({ use: ProjectorUseQuery }),
		},
		responses: {
			200: { content: { 'application/json': { schema: BibleChapterSchema } }, description: 'Chapter with all verses' },
			403: {
				content: { 'application/json': { schema: ErrorSchema } },
				description: 'use=projector and the translation is not licensed for a shared screen',
			},
			404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
		},
	}),
	async (c) => {
		const { code, bookCode, n } = c.req.valid('param');
		const t = await catalog.resolveTranslation(c.env, code);
		if (!t) return c.json(NOT_FOUND, 404);
		if (c.req.valid('query').use === 'projector' && projectorRefusals([t]).length > 0) {
			return c.json({ error: `Not licensed for a shared screen: ${t.name}` }, 403);
		}
		const chapter = await catalog.getChapter(c.env, t, bookCode, n);
		if (!chapter) return c.json(NOT_FOUND, 404);
		return c.json(chapter, 200);
	},
);

router.openapi(
	createRoute({
		method: 'get',
		path: '/parallel',
		tags: ['Bible'],
		middleware: [textCache],
		request: {
			query: z.object({
				t: z
					.string()
					.optional()
					.openapi({ description: '2–4 comma-separated translation codes, primary first', example: 'synodal,schlachter1905,kjv' }),
				a: z.string().optional().openapi({ description: 'Legacy form: translation code A (use t instead)', example: 'delut' }),
				b: z.string().optional().openapi({ description: 'Legacy form: translation code B (use t instead)', example: 'kjv' }),
				book: z.string().openapi({ description: 'USFM book code', example: 'EZK' }),
				chapter: z.coerce.number().int().positive().openapi({ description: "Chapter in the first translation's numbering", example: 36 }),
				use: ProjectorUseQuery,
			}),
		},
		responses: {
			200: {
				content: { 'application/json': { schema: ParallelChapterSchema } },
				description: '2–4 translations aligned by verse number (Psalms remapped LXX↔Hebrew relative to the first)',
			},
			400: {
				content: { 'application/json': { schema: ErrorSchema } },
				description: 'Fewer than 2 or more than 4 translations, or the same one twice',
			},
			403: {
				content: { 'application/json': { schema: ErrorSchema } },
				description: 'use=projector and a translation is not licensed for a shared screen',
			},
			404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Translation, book, or chapter not found' },
		},
	}),
	async (c) => {
		const { t, a, b, book, chapter, use } = c.req.valid('query');
		const parsed = parseParallelCodes({ t, a, b });
		if (!parsed.ok) return c.json({ error: parsed.error }, 400);

		const translations = await Promise.all(parsed.codes.map((code) => catalog.resolveTranslation(c.env, code)));
		if (translations.some((tr) => !tr)) return c.json(NOT_FOUND, 404);
		const resolved = translations as catalog.Translation[];
		if (new Set(resolved.map((tr) => tr.id)).size !== resolved.length) {
			return c.json({ error: 'Pick different translations' }, 400);
		}

		if (use === 'projector') {
			const refused = projectorRefusals(resolved);
			if (refused.length > 0) {
				return c.json({ error: `Not licensed for a shared screen: ${refused.join(', ')}` }, 403);
			}
		}

		const result = await catalog.getParallelChapter(c.env, resolved, book, chapter);
		if (!result) return c.json(NOT_FOUND, 404);
		if (!parsed.legacy) return c.json(result, 200);

		// The original two-translation shape, for links and clients that predate `t`.
		const [sideA, sideB] = result.translations;
		return c.json(
			{
				...result,
				a: sideA,
				b: sideB,
				verses: result.verses.map((v) => ({ ...v, a: v.texts[0], b: v.texts[1] })),
			},
			200,
		);
	},
);

router.openapi(
	createRoute({
		method: 'get',
		path: '/search',
		tags: ['Bible'],
		request: {
			query: z.object({
				q: z.string().openapi({ description: 'Search text, 2–100 characters', example: 'Gnade' }),
				translation: z
					.string()
					.optional()
					.openapi({ description: 'Restrict to one translation (code, prefixed id, or numeric YouVersion id)' }),
				book: z.string().optional().openapi({ description: 'Restrict to one USFM book code', example: 'PSA' }),
				limit: z.coerce.number().int().positive().max(100).optional().openapi({ example: 20 }),
				offset: z.coerce.number().int().min(0).optional().openapi({ example: 0 }),
			}),
		},
		responses: {
			200: {
				content: { 'application/json': { schema: listOf(BibleSearchHitSchema) } },
				description: 'Verses matching the query, from locally-hosted translations with allowSearchIndex set',
			},
			400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'q is missing, too short, or too long' },
			403: {
				content: { 'application/json': { schema: ErrorSchema } },
				description: 'The named translation exists but is not indexed for search',
			},
			404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'The named translation is not enabled' },
		},
	}),
	async (c) => {
		const { q, translation, book, limit, offset } = c.req.valid('query');
		if (q.length < 2 || q.length > 100) {
			return c.json({ error: 'q must be between 2 and 100 characters' }, 400);
		}

		let translations;
		if (translation) {
			const t = await catalog.resolveTranslation(c.env, translation);
			if (!t) return c.json(NOT_FOUND, 404);
			if (!t.license.allowSearchIndex) {
				return c.json({ error: 'This translation is not indexed for search.' }, 403);
			}
			translations = [t];
		} else {
			translations = await catalog.listTranslations(c.env);
		}

		const result = await catalog.search(c.env, { q, translations, book, limit: limit ?? 20, offset: offset ?? 0 });
		return c.json(result, 200);
	},
);

router.openapi(
	createRoute({
		method: 'get',
		path: '/translations/{code}/bundle',
		tags: ['Bible'],
		request: { params: z.object({ code: z.string() }) },
		responses: {
			200: {
				content: { 'application/json': { schema: BibleBundleManifestSchema } },
				description: 'Offline bundle manifest',
			},
			403: {
				content: { 'application/json': { schema: ErrorSchema } },
				description: 'Translation is not enabled for download and offline use',
			},
			404: {
				content: { 'application/json': { schema: ErrorSchema } },
				description: 'Translation not found or not enabled, or no bundle has been generated for it',
			},
		},
	}),
	async (c) => {
		const t = await catalog.resolveTranslation(c.env, c.req.valid('param').code);
		if (!t) return c.json(NOT_FOUND, 404);
		if (!t.license.allowOffline || !t.license.allowDownload) {
			return c.json({ error: 'This translation is not enabled for offline download.' }, 403);
		}
		const record = await local.getRecord(c.env, t.id);
		if (!record?.bundleKey) return c.json(NOT_FOUND, 404);
		return c.json(
			{
				translationId: t.id,
				code: t.code,
				name: t.name,
				language: t.language,
				verseCount: record.verseCount,
				bookCount: record.bookCount,
				key: record.bundleKey,
				license: t.license,
			},
			200,
		);
	},
);

export default router;
