import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../types';
import { getAllConfig } from '../repositories/config';

const router = new OpenAPIHono<{ Bindings: Bindings }>();

const getConfigRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Config'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.record(z.string(), z.string().nullable()).openapi('Config'),
        },
      },
      description: 'All site config key/value pairs',
    },
  },
});

router.openapi(getConfigRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const config = await getAllConfig(db);
  return c.json(config, 200);
});

export default router;
