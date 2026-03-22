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
