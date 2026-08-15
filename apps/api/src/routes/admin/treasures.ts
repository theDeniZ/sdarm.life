import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../../types';
import { ErrorSchema, listOf, OkSchema, PaginationQuery, TreasureSchema, TreasureTypeSchema } from '../../schemas';
import * as repo from '../../repositories/treasures';
import { purgeCache } from '../../middleware/cache';

const router = new OpenAPIHono<{ Bindings: Bindings }>();

const TreasureBody = z.object({
  title: z.string().min(1),
  author: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  type: TreasureTypeSchema.optional(),
  language: z.string().min(1),
  coverGradient: z.string().nullable().optional(),
  coverAccentColor: z.string().nullable().optional(),
  coverKey: z.string().nullable().optional(),
  isFree: z.boolean().optional(),
  price: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  epubUrl: z.string().nullable().optional(),
  epubKey: z.string().nullable().optional(),
});

router.openapi(
  createRoute({
    method: 'get',
    path: '/treasures',
    tags: ['Admin / Treasures'],
    security: [{ bearerAuth: [] }],
    request: { query: PaginationQuery },
    responses: {
      200: { content: { 'application/json': { schema: listOf(TreasureSchema) } }, description: 'All treasures' },
    },
  }),
  async (c) => {
    const db = drizzle(c.env.DB);
    const { limit, offset } = c.req.valid('query');
    return c.json(await repo.listTreasures(db, { limit, offset }), 200);
  },
);

router.openapi(
  createRoute({
    method: 'post',
    path: '/treasures',
    tags: ['Admin / Treasures'],
    security: [{ bearerAuth: [] }],
    request: { body: { content: { 'application/json': { schema: TreasureBody } }, required: true } },
    responses: {
      201: { content: { 'application/json': { schema: TreasureSchema } }, description: 'Created' },
    },
  }),
  async (c) => {
    const db = drizzle(c.env.DB);
    const treasure = await repo.createTreasure(db, c.req.valid('json'));
    const origin = new URL(c.req.url).origin;
    purgeCache(c.executionCtx, origin, ['/api/v1/treasures'], c.env);
    return c.json(treasure, 201);
  },
);

router.openapi(
  createRoute({
    method: 'post',
    path: '/treasures/batch',
    tags: ['Admin / Treasures'],
    security: [{ bearerAuth: [] }],
    request: { body: { content: { 'application/json': { schema: z.array(TreasureBody) } }, required: true } },
    responses: {
      201: { content: { 'application/json': { schema: z.object({ created: z.number() }) } }, description: 'Batch imported' },
    },
  }),
  async (c) => {
    const db = drizzle(c.env.DB);
    const items = c.req.valid('json');
    await Promise.all(items.map((item) => repo.createTreasure(db, item)));
    const origin = new URL(c.req.url).origin;
    purgeCache(c.executionCtx, origin, ['/api/v1/treasures'], c.env);
    return c.json({ created: items.length }, 201);
  },
);

router.openapi(
  createRoute({
    method: 'patch',
    path: '/treasures/{id}',
    tags: ['Admin / Treasures'],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ id: z.coerce.number() }),
      body: { content: { 'application/json': { schema: TreasureBody.partial() } }, required: true },
    },
    responses: {
      200: { content: { 'application/json': { schema: TreasureSchema } }, description: 'Updated' },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const db = drizzle(c.env.DB);
    const treasure = await repo.updateTreasure(db, c.req.valid('param').id, c.req.valid('json'));
    if (!treasure) return c.json({ error: 'Not found' }, 404);
    const origin = new URL(c.req.url).origin;
    purgeCache(c.executionCtx, origin, ['/api/v1/treasures', `/api/v1/treasures/${treasure.id}`], c.env);
    return c.json(treasure, 200);
  },
);

// Browsers inconsistently report the EPUB mime type — some send 'application/octet-stream'
// or nothing at all since EPUB is an uncommon type on the OS's registry. The extension is
// the reliable signal; content-type is only used to reject an obviously wrong file.
const EPUB_CONTENT_TYPES = ['application/epub+zip', 'application/octet-stream', ''];

router.openapi(
  createRoute({
    method: 'post',
    path: '/treasures/epub/upload',
    tags: ['Admin / Treasures'],
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          'multipart/form-data': {
            schema: z.object({
              file: z.any().openapi({ type: 'string', format: 'binary', description: 'EPUB file to upload' }),
            }),
          },
        },
        required: true,
      },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: z.object({ key: z.string() }) } },
        description: 'R2 object key of the uploaded EPUB',
      },
      400: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'No file provided, or file is not an EPUB',
      },
    },
  }),
  // Multipart: use formData() directly — Zod body validation is skipped
  async (c) => {
    const form = await c.req.formData();
    const file = form.get('file') as File | null;

    if (!file) return c.json({ error: 'No file' }, 400);

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (ext !== 'epub' || !EPUB_CONTENT_TYPES.includes(file.type)) {
      return c.json({ error: 'File must be an EPUB' }, 400);
    }

    const key = `books/${crypto.randomUUID()}.epub`;

    // No `images` D1 row here on purpose — that table drives the admin Image Library's
    // usage tracking against posts/config, and an EPUB isn't part of that domain.
    await c.env.IMAGES.put(key, file.stream(), {
      httpMetadata: { contentType: 'application/epub+zip', cacheControl: 'public, max-age=31536000, immutable' },
    });

    return c.json({ key }, 200);
  },
);

router.openapi(
  createRoute({
    method: 'delete',
    path: '/treasures/{id}',
    tags: ['Admin / Treasures'],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: z.coerce.number() }) },
    responses: {
      200: { content: { 'application/json': { schema: OkSchema } }, description: 'Deleted' },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const db = drizzle(c.env.DB);
    const id = c.req.valid('param').id;
    const existing = await repo.getTreasureById(db, id);
    if (!existing) return c.json({ error: 'Not found' }, 404);
    await repo.deleteTreasure(db, id);
    const origin = new URL(c.req.url).origin;
    purgeCache(c.executionCtx, origin, ['/api/v1/treasures', `/api/v1/treasures/${id}`], c.env);
    return c.json({ ok: true as const }, 200);
  },
);

export default router;
