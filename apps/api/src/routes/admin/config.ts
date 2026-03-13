import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../../types';
import { KNOWN_CONFIG_KEYS } from '@sdarm/db';
import { upsertConfig } from '../../repositories/config';
import { ErrorSchema, OkSchema } from '../../schemas';

const router = new OpenAPIHono<{ Bindings: Bindings }>();

const upsertConfigRoute = createRoute({
  method: 'put',
  path: '/{key}',
  tags: ['Admin / Config'],
  security: [{ cfAccess: [] }],
  request: {
    params: z.object({ key: z.enum(KNOWN_CONFIG_KEYS) }),
    body: {
      content: { 'application/json': { schema: z.object({ value: z.string().nullable() }) } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: OkSchema } },
      description: 'Config key updated',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Unknown config key',
    },
  },
});

router.openapi(upsertConfigRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const { key } = c.req.valid('param');
  const { value } = c.req.valid('json');
  await upsertConfig(db, key, value);
  return c.json({ ok: true as const }, 200);
});

export default router;
