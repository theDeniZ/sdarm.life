import { Hono } from 'hono';
import type { Bindings } from '../types';

const router = new Hono<{ Bindings: Bindings }>();

router.get('/*', async (c) => {
	const key = c.req.path.replace(/^\/api\/v1\/images\//, '');
	const obj = await c.env.IMAGES.get(key);
	if (!obj) return c.json({ error: 'Not found' }, 404);
	const headers = new Headers();
	if (obj.httpMetadata?.contentType) headers.set('Content-Type', obj.httpMetadata.contentType);
	return new Response(obj.body, { headers });
});

export default router;
