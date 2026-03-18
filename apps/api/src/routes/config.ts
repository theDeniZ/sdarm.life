import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Bindings } from '../types';

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
  const config = await c.env.KV.get<Record<string, string | null>>('config', 'json');
  return c.json(config ?? {}, 200);
});

export default router;
