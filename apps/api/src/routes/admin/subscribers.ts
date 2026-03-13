import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../../types';
import { listSubscribers, deleteSubscriber } from '../../repositories/subscribers';
import { ErrorSchema, listOf, OkSchema, PaginationQuery, SubscriberSchema } from '../../schemas';

const router = new OpenAPIHono<{ Bindings: Bindings }>();

const listSubscribersRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Admin / Subscribers'],
  security: [{ cfAccess: [] }],
  request: { query: PaginationQuery },
  responses: {
    200: {
      content: { 'application/json': { schema: listOf(SubscriberSchema) } },
      description: 'Paginated list of active subscribers',
    },
  },
});

const deleteSubscriberRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Admin / Subscribers'],
  security: [{ cfAccess: [] }],
  request: { params: z.object({ id: z.coerce.number() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: OkSchema } },
      description: 'Subscriber deleted',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Not found',
    },
  },
});

router.openapi(listSubscribersRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const { limit, offset } = c.req.valid('query');
  const result = await listSubscribers(db, { limit, offset: offset ?? 0 });
  return c.json(result, 200);
});

router.openapi(deleteSubscriberRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const sub = await deleteSubscriber(db, c.req.valid('param').id);
  if (!sub) return c.json({ error: 'Not found' }, 404);
  return c.json({ ok: true as const }, 200);
});

export default router;
