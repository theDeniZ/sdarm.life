import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../types';
import { listPosts, getPostBySlug } from '../repositories/posts';

const router = new Hono<{ Bindings: Bindings }>();

router.get('/', async (c) => {
	const db = drizzle(c.env.DB);
	const { featured, video, limit: limitQ, offset: offsetQ } = c.req.query();

	const { items, total } = await listPosts(db, {
		featured: featured === '1',
		video:    video    === '1',
		limit:    limitQ  ? parseInt(limitQ,  10) : undefined,
		offset:   offsetQ ? parseInt(offsetQ, 10) : 0,
	});

	return c.json({ items, total });
});

router.get('/:slug', async (c) => {
	const db   = drizzle(c.env.DB);
	const post = await getPostBySlug(db, c.req.param('slug'));
	if (!post || post.deletedAt) return c.json({ error: 'Not found' }, 404);
	return c.json(post);
});

export default router;
