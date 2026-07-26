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
import * as catalog from '../services/bible/catalog';

/**
 * Public Bible routes. Content comes from YouVersion via the server-side client
 * in `services/bible/` — the app key stays in the Worker, and only translations
 * the operator enabled in Admin → Bible are reachable here.
 *
 * Edge caching is per-route rather than a blanket mount. The two translation
 * endpoints are driven by the admin allowlist and stay uncached so enabling or
 * disabling a translation takes effect at once; they are cheap because the
 * underlying YouVersion calls are KV-cached. Scripture text never changes, so
 * books/chapters/parallel are cached at the edge for a day.
 */
const router = new OpenAPIHono<{ Bindings: Bindings }>();

const NOT_FOUND = { error: 'Not found' } as const;
const ONE_DAY = 86400;
const textCache = cached(ONE_DAY);

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

export default router;
