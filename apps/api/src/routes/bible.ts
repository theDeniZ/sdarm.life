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
		},
		responses: {
			200: { content: { 'application/json': { schema: BibleChapterSchema } }, description: 'Chapter with all verses' },
			404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
		},
	}),
	async (c) => {
		const { code, bookCode, n } = c.req.valid('param');
		const t = await catalog.resolveTranslation(c.env, code);
		if (!t) return c.json(NOT_FOUND, 404);
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
				a: z.string().openapi({ description: 'Translation code A', example: 'delut' }),
				b: z.string().openapi({ description: 'Translation code B', example: 'kjv' }),
				book: z.string().openapi({ description: 'USFM book code', example: 'JHN' }),
				chapter: z.coerce.number().int().positive().openapi({ example: 3 }),
			}),
		},
		responses: {
			200: {
				content: { 'application/json': { schema: ParallelChapterSchema } },
				description: 'Two translations aligned by verse number (Psalms remapped LXX↔Hebrew)',
			},
			400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Same translation on both sides' },
			404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Translation, book, or chapter not found' },
		},
	}),
	async (c) => {
		const { a, b, book, chapter } = c.req.valid('query');
		if (a === b) return c.json({ error: 'Pick two different translations' }, 400);
		const [trA, trB] = await Promise.all([catalog.resolveTranslation(c.env, a), catalog.resolveTranslation(c.env, b)]);
		if (!trA || !trB) return c.json(NOT_FOUND, 404);
		const result = await catalog.getParallelChapter(c.env, trA, trB, book, chapter);
		if (!result) return c.json(NOT_FOUND, 404);
		return c.json(result, 200);
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
