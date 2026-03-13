import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../types';
import { createSubscriber, unsubscribeByToken } from '../repositories/subscribers';
import { ErrorSchema, OkSchema } from '../schemas';

const router = new OpenAPIHono<{ Bindings: Bindings }>();

const subscribeRoute = createRoute({
  method: 'post',
  path: '/subscribe',
  tags: ['Subscribers'],
  request: {
    body: {
      content: { 'application/json': { schema: z.object({ email: z.string().email() }) } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: OkSchema } },
      description: 'Subscribed successfully',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Invalid email',
    },
    409: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Already subscribed',
    },
  },
});

const unsubscribeRoute = createRoute({
  method: 'get',
  path: '/unsubscribe',
  tags: ['Subscribers'],
  request: {
    query: z.object({ token: z.string() }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: OkSchema } },
      description: 'Unsubscribed successfully',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Missing token',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Invalid token',
    },
  },
});

router.openapi(subscribeRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const { email } = c.req.valid('json');

  if (!email.includes('@')) return c.json({ error: 'Invalid email' }, 400);

  try {
    const token = crypto.randomUUID();
    await createSubscriber(db, email.toLowerCase().trim(), token);
  } catch {
    return c.json({ error: 'Already subscribed' }, 409);
  }

  return c.json({ ok: true as const }, 201);
});

router.openapi(unsubscribeRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const { token } = c.req.valid('query');

  const sub = await unsubscribeByToken(db, token);
  if (!sub) return c.json({ error: 'Invalid token' }, 404);

  return c.json({ ok: true as const }, 200);
});

export default router;
