import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../../types';
import { ErrorSchema } from '../../schemas';
import { getBookRequestById, logAudit } from '../../repositories/book-requests';

const router = new OpenAPIHono<{ Bindings: Bindings }>();

const BookRequestSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  land: z.string(),
  street: z.string(),
  plz: z.string(),
  city: z.string(),
  books: z.array(z.string()),
  wish: z.string().nullable(),
  language: z.string(),
  requestedAt: z.string(),
});

const getBookRequestRoute = createRoute({
  method: 'get',
  path: '/book-requests/{id}',
  tags: ['Admin - Book Requests'],
  request: {
    params: z.object({ id: z.coerce.number().int().positive() }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: BookRequestSchema } },
      description: 'Book request detail',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Not found',
    },
  },
});

router.openapi(getBookRequestRoute, async (c) => {
  const { id } = c.req.valid('param');
  const db = drizzle(c.env.DB);
  const row = await getBookRequestById(db, id);
  if (!row) return c.json({ error: 'Not found' }, 404);

  c.executionCtx.waitUntil(logAudit(db, 'read', id));

  return c.json({
    ...row,
    requestedAt: row.requestedAt instanceof Date ? row.requestedAt.toISOString() : String(row.requestedAt),
  }, 200);
});

export default router;
