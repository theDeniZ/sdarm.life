import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { drizzle } from 'drizzle-orm/d1';
import { posts, siteConfig } from '@sdarm/db';
import { and, isNull, eq, isNotNull, desc } from 'drizzle-orm';

type Bindings = {
	DB: D1Database;
	IMAGES: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors({ origin: ['https://sdarm.life', 'http://localhost:3000'] }));

// ── v1 routes ─────────────────────────────────────────────────────────────────

const v1 = new Hono<{ Bindings: Bindings }>();

v1.get('/posts', async (c) => {
	const db = drizzle(c.env.DB);
	const { featured, video } = c.req.query();

	let filter = isNull(posts.deletedAt);
	if (featured === '1') filter = and(filter, eq(posts.isFeatured, true))!;
	if (video === '1') filter = and(filter, isNotNull(posts.videoUrl))!;

	const rows = await db
		.select()
		.from(posts)
		.where(filter)
		.orderBy(desc(posts.publishedAt));

	return c.json(rows);
});

v1.get('/posts/:slug', async (c) => {
	const db = drizzle(c.env.DB);
	const slug = c.req.param('slug');

	const [post] = await db
		.select()
		.from(posts)
		.where(eq(posts.slug, slug))
		.limit(1);

	if (!post || post.deletedAt) return c.json({ error: 'Not found' }, 404);
	return c.json(post);
});

v1.get('/config', async (c) => {
	const db = drizzle(c.env.DB);
	const rows = await db.select().from(siteConfig);
	const config = Object.fromEntries(rows.map((r) => [r.key, r.value]));
	return c.json(config);
});

app.route('/api/v1', v1);

export default app;
