import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Bindings } from '../types';
import {
	BibleBookSchema,
	BibleChapterSchema,
	BibleTranslationSchema,
	ErrorSchema,
	ParallelChapterSchema,
	listOf,
} from '../schemas';
import { cached } from '../middleware/cache';
import * as source from '../services/bible/source';

const router = new OpenAPIHono<{ Bindings: Bindings }>();

const ONE_DAY = 86400;
const ONE_YEAR = 31536000;

router.use('*', cached(ONE_DAY));

router.openapi(
	createRoute({
		method: 'get',
		path: '/translations',
		tags: ['Bible'],
		responses: {
			200: { content: { 'application/json': { schema: listOf(BibleTranslationSchema) } }, description: 'All Bible translations (YouVersion catalog merged with treasure-side metadata; D1 fallback for the 3 baked-in translations).' },
		},
	}),
	async (c) => {
		const [result, src] = await source.listTranslations(c.env);
		c.header('X-Source', src);
		return c.json(result, 200);
	},
);

router.openapi(
	createRoute({
		method: 'get',
		path: '/translations/{code}',
		tags: ['Bible'],
		request: { params: z.object({ code: z.string() }) },
		responses: {
			200: { content: { 'application/json': { schema: BibleTranslationSchema } }, description: 'Translation metadata (YouVersion → D1 fallback)' },
			404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
		},
	}),
	async (c) => {
		const [t, src] = await source.getTranslationByCode(c.env, c.req.valid('param').code);
		c.header('X-Source', src);
		if (!t) return c.json({ error: 'Not found' }, 404);
		return c.json(t, 200);
	},
);

router.openapi(
	createRoute({
		method: 'get',
		path: '/translations/{code}/books',
		tags: ['Bible'],
		request: { params: z.object({ code: z.string() }) },
		responses: {
			200: { content: { 'application/json': { schema: listOf(BibleBookSchema) } }, description: '66 books in canonical order (YouVersion → D1 fallback)' },
			404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Translation not found' },
		},
	}),
	async (c) => {
		const code = c.req.valid('param').code;
		const [t] = await source.getTranslationByCode(c.env, code);
		if (!t) {
			c.header('X-Source', 'd1');
			return c.json({ error: 'Not found' }, 404);
		}
		const [books, src] = await source.listBooks(c.env, code);
		c.header('X-Source', src);
		return c.json(books, 200);
	},
);

router.openapi(
	createRoute({
		method: 'get',
		path: '/translations/{code}/books/{bookCode}',
		tags: ['Bible'],
		request: { params: z.object({ code: z.string(), bookCode: z.string() }) },
		responses: {
			200: { content: { 'application/json': { schema: BibleBookSchema } }, description: 'Book metadata' },
			404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
		},
	}),
	async (c) => {
		const { code, bookCode } = c.req.valid('param');
		const [book, src] = await source.getBook(c.env, code, bookCode);
		c.header('X-Source', src);
		if (!book) return c.json({ error: 'Not found' }, 404);
		return c.json(book, 200);
	},
);

const chapterCache = cached(ONE_YEAR);

router.openapi(
	createRoute({
		method: 'get',
		path: '/translations/{code}/books/{bookCode}/chapters/{n}',
		tags: ['Bible'],
		middleware: [chapterCache],
		request: {
			params: z.object({ code: z.string(), bookCode: z.string(), n: z.coerce.number().int().positive() }),
		},
		responses: {
			200: { content: { 'application/json': { schema: BibleChapterSchema } }, description: 'Chapter with all verses (KV → YouVersion → D1 fallback)' },
			404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
		},
	}),
	async (c) => {
		const { code, bookCode, n } = c.req.valid('param');
		const [chapter, src] = await source.getChapter(c.env, code, bookCode, n);
		c.header('X-Source', src);
		if (!chapter) return c.json({ error: 'Not found' }, 404);
		return c.json(chapter, 200);
	},
);

router.openapi(
	createRoute({
		method: 'get',
		path: '/parallel',
		tags: ['Bible'],
		middleware: [chapterCache],
		request: {
			query: z.object({
				a: z.string().openapi({ description: 'Translation code A', example: 'luther1912' }),
				b: z.string().openapi({ description: 'Translation code B', example: 'kjv' }),
				book: z.string().openapi({ description: 'Book code (USFM)', example: 'JOH' }),
				chapter: z.coerce.number().int().positive().openapi({ example: 3 }),
			}),
		},
		responses: {
			200: { content: { 'application/json': { schema: ParallelChapterSchema } }, description: 'Two translations side-by-side, aligned by verse number' },
			400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Same translation on both sides' },
			404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Translation, book, or chapter not found' },
		},
	}),
	async (c) => {
		const { a, b, book, chapter } = c.req.valid('query');
		if (a === b) return c.json({ error: 'Pick two different translations' }, 400);
		const [result, src] = await source.getParallelChapter(c.env, a, b, book, chapter);
		c.header('X-Source', src);
		if (!result) return c.json({ error: 'Not found' }, 404);
		return c.json(result, 200);
	},
);

export default router;
