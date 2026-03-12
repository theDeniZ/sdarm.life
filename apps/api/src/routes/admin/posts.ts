import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../../types';
import { getPostById, createPost, updatePost, softDeletePost } from '../../repositories/posts';

const router = new Hono<{ Bindings: Bindings }>();

router.get('/:id', async (c) => {
	const db   = drizzle(c.env.DB);
	const id   = parseInt(c.req.param('id'), 10);
	const post = await getPostById(db, id);
	if (!post) return c.json({ error: 'Not found' }, 404);
	return c.json(post);
});

router.post('/', async (c) => {
	const db   = drizzle(c.env.DB);
	const body = await c.req.json<{
		title: string;
		slug: string;
		excerpt?: string;
		body?: string;
		author?: string;
		videoUrl?: string;
		coverKey?: string;
		coverAlt?: string;
		thumbKey?: string;
		isFeatured?: boolean;
		publishedAt?: string;
	}>();

	const post = await createPost(db, body);
	return c.json(post, 201);
});

router.patch('/:id', async (c) => {
	const db   = drizzle(c.env.DB);
	const id   = parseInt(c.req.param('id'), 10);
	const body = await c.req.json<Partial<{
		title: string;
		slug: string;
		excerpt: string | null;
		body: string | null;
		author: string | null;
		videoUrl: string | null;
		coverKey: string | null;
		coverAlt: string | null;
		thumbKey: string | null;
		isFeatured: boolean;
		publishedAt: string | null;
		deletedAt: string | null;
	}>>();

	const post = await updatePost(db, id, body);
	if (!post) return c.json({ error: 'Not found' }, 404);
	return c.json(post);
});

router.delete('/:id', async (c) => {
	const db   = drizzle(c.env.DB);
	const id   = parseInt(c.req.param('id'), 10);
	const post = await softDeletePost(db, id);
	if (!post) return c.json({ error: 'Not found' }, 404);
	return c.json({ ok: true });
});

export default router;
