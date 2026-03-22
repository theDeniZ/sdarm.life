import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../types';
import { ErrorSchema, listOf, PaginationQuery, TreasureSchema, TreasureTypeSchema } from '../schemas';
import * as repo from '../repositories/treasures';

const router = new OpenAPIHono<{ Bindings: Bindings }>();

router.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Treasures'],
    request: {
      query: PaginationQuery.extend({
        type: TreasureTypeSchema.optional().openapi({ description: 'Filter by type' }),
        language: z.string().optional().openapi({ description: 'Filter by language code' }),
      }),
    },
    responses: {
      200: { content: { 'application/json': { schema: listOf(TreasureSchema) } }, description: 'Paginated treasure list' },
    },
  }),
  async (c) => {
    const db = drizzle(c.env.DB);
    const { type, language, limit, offset } = c.req.valid('query');
    return c.json(await repo.listTreasures(db, { type, language, limit, offset }), 200);
  },
);

router.openapi(
  createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Treasures'],
    request: { params: z.object({ id: z.coerce.number() }) },
    responses: {
      200: { content: { 'application/json': { schema: TreasureSchema } }, description: 'Treasure detail' },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const db = drizzle(c.env.DB);
    const treasure = await repo.getTreasureById(db, c.req.valid('param').id);
    if (!treasure) return c.json({ error: 'Not found' }, 404);
    return c.json(treasure, 200);
  },
);

export default router;
