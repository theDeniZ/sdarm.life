import { OpenAPIHono } from '@hono/zod-openapi';
import type { Bindings } from '../types';

const router = new OpenAPIHono<{ Bindings: Bindings }>();

// Local-dev R2 proxy — intentionally undocumented
router.get('/*', async (c) => {
  const key = c.req.path.replace(/^\/api\/v1\/images\//, '');
  const obj = await c.env.IMAGES.get(key);
  if (!obj) return c.json({ error: 'Not found' }, 404);
  const headers = new Headers();
  if (obj.httpMetadata?.contentType) headers.set('Content-Type', obj.httpMetadata.contentType);
  return new Response(obj.body, { headers });
});

export default router;
