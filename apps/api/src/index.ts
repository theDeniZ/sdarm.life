import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { drizzle } from 'drizzle-orm/d1';
import { posts, siteConfig, subscribers, KNOWN_CONFIG_KEYS } from '@sdarm/db';
import { and, isNull, eq, isNotNull, desc } from 'drizzle-orm';

type Bindings = {
	DB: D1Database;
	IMAGES: R2Bucket;
	CF_CLIENT_ID: string;
	CF_CLIENT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(
	'*',
	cors({
		origin: [
			'https://sdarm.life',
			'https://admin.sdarm.life',
			'http://localhost:3000',
			'http://localhost:3001',
		],
	}),
);

// ── v1 routes ─────────────────────────────────────────────────────────────────

const v1 = new Hono<{ Bindings: Bindings }>();

// ── Public ────────────────────────────────────────────────────────────────────

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

v1.get('/images/*', async (c) => {
	const key = c.req.path.replace(/^\/api\/v1\/images\//, '');
	const obj = await c.env.IMAGES.get(key);
	if (!obj) return c.json({ error: 'Not found' }, 404);
	const headers = new Headers();
	if (obj.httpMetadata?.contentType) headers.set('Content-Type', obj.httpMetadata.contentType);
	return new Response(obj.body, { headers });
});

v1.post('/subscribe', async (c) => {
	const db = drizzle(c.env.DB);
	const { email } = await c.req.json<{ email: string }>();

	if (!email || !email.includes('@')) {
		return c.json({ error: 'Invalid email' }, 400);
	}

	const token = crypto.randomUUID();

	try {
		await db.insert(subscribers).values({ email: email.toLowerCase().trim(), token });
	} catch {
		// unique constraint — already subscribed (or was unsubscribed)
		return c.json({ error: 'Already subscribed' }, 409);
	}

	return c.json({ ok: true }, 201);
});

v1.get('/unsubscribe', async (c) => {
	const db = drizzle(c.env.DB);
	const token = c.req.query('token');

	if (!token) return c.json({ error: 'Missing token' }, 400);

	const [sub] = await db
		.select()
		.from(subscribers)
		.where(eq(subscribers.token, token))
		.limit(1);

	if (!sub) return c.json({ error: 'Invalid token' }, 404);

	await db.delete(subscribers).where(eq(subscribers.token, token));

	return c.json({ ok: true });
});

// ── Admin middleware ───────────────────────────────────────────────────────────

const admin = new Hono<{ Bindings: Bindings }>();

admin.use('*', async (c, next) => {
	const id = c.req.header('CF-Access-Client-Id');
	const secret = c.req.header('CF-Access-Client-Secret');
	if (!id || !secret || id !== c.env.CF_CLIENT_ID || secret !== c.env.CF_CLIENT_SECRET) {
		return c.json({ error: 'Unauthorized' }, 401);
	}
	await next();
});

// ── Admin — posts ─────────────────────────────────────────────────────────────

admin.post('/posts', async (c) => {
	const db = drizzle(c.env.DB);
	const body = await c.req.json<{
		title: string;
		slug: string;
		excerpt?: string;
		body?: string;
		author?: string;
		videoUrl?: string;
		coverKey?: string;
		coverAlt?: string;
		isFeatured?: boolean;
		publishedAt?: string;
	}>();

	const [post] = await db
		.insert(posts)
		.values({
			title: body.title,
			slug: body.slug,
			excerpt: body.excerpt ?? null,
			body: body.body ?? null,
			author: body.author ?? null,
			videoUrl: body.videoUrl ?? null,
			coverKey: body.coverKey ?? null,
			coverAlt: body.coverAlt ?? null,
			isFeatured: body.isFeatured ?? false,
			publishedAt: body.publishedAt ? new Date(body.publishedAt) : new Date(),
		})
		.returning();

	return c.json(post, 201);
});

admin.patch('/posts/:id', async (c) => {
	const db = drizzle(c.env.DB);
	const id = parseInt(c.req.param('id'), 10);
	const body = await c.req.json<Partial<{
		title: string;
		slug: string;
		excerpt: string | null;
		body: string | null;
		author: string | null;
		videoUrl: string | null;
		coverKey: string | null;
		coverAlt: string | null;
		isFeatured: boolean;
		publishedAt: string | null;
		deletedAt: string | null;
	}>>();

	const update: Record<string, unknown> = { updatedAt: new Date() };
	if (body.title !== undefined)     update.title = body.title;
	if (body.slug !== undefined)      update.slug = body.slug;
	if (body.excerpt !== undefined)   update.excerpt = body.excerpt;
	if ('body' in body)               update.body = body.body;
	if (body.author !== undefined)    update.author = body.author;
	if (body.videoUrl !== undefined)  update.videoUrl = body.videoUrl;
	if (body.coverKey !== undefined)  update.coverKey = body.coverKey;
	if (body.coverAlt !== undefined)  update.coverAlt = body.coverAlt;
	if (body.isFeatured !== undefined) update.isFeatured = body.isFeatured;
	if (body.publishedAt !== undefined) update.publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;
	if (body.deletedAt !== undefined) update.deletedAt = body.deletedAt ? new Date(body.deletedAt) : null;

	const [post] = await db
		.update(posts)
		.set(update)
		.where(eq(posts.id, id))
		.returning();

	if (!post) return c.json({ error: 'Not found' }, 404);
	return c.json(post);
});

admin.delete('/posts/:id', async (c) => {
	const db = drizzle(c.env.DB);
	const id = parseInt(c.req.param('id'), 10);

	const [post] = await db
		.update(posts)
		.set({ deletedAt: new Date(), updatedAt: new Date() })
		.where(and(eq(posts.id, id), isNull(posts.deletedAt)))
		.returning();

	if (!post) return c.json({ error: 'Not found' }, 404);
	return c.json({ ok: true });
});

// ── Admin — config ────────────────────────────────────────────────────────────

admin.put('/config/:key', async (c) => {
	const db = drizzle(c.env.DB);
	const key = c.req.param('key');

	if (!KNOWN_CONFIG_KEYS.includes(key as never)) {
		return c.json({ error: 'Unknown config key' }, 400);
	}

	const { value } = await c.req.json<{ value: string | null }>();

	await db
		.insert(siteConfig)
		.values({ key, value, updatedAt: new Date() })
		.onConflictDoUpdate({ target: siteConfig.key, set: { value, updatedAt: new Date() } });

	return c.json({ ok: true });
});

// ── Admin — image upload ──────────────────────────────────────────────────────

admin.post('/images/upload', async (c) => {
	const form = await c.req.formData();
	const file = form.get('file') as File | null;

	if (!file) return c.json({ error: 'No file' }, 400);

	const ext = file.name.split('.').pop() ?? 'bin';
	const key = `uploads/${crypto.randomUUID()}.${ext}`;

	await c.env.IMAGES.put(key, file.stream(), {
		httpMetadata: { contentType: file.type },
	});

	return c.json({ key });
});

// ── Admin — subscribers ───────────────────────────────────────────────────────

admin.get('/subscribers', async (c) => {
	const db = drizzle(c.env.DB);
	const rows = await db
		.select()
		.from(subscribers)
		.orderBy(desc(subscribers.createdAt));
	return c.json(rows);
});

admin.delete('/subscribers/:id', async (c) => {
	const db = drizzle(c.env.DB);
	const id = parseInt(c.req.param('id'), 10);

	const [sub] = await db
		.delete(subscribers)
		.where(eq(subscribers.id, id))
		.returning();

	if (!sub) return c.json({ error: 'Not found' }, 404);
	return c.json({ ok: true });
});

// ── Mount ─────────────────────────────────────────────────────────────────────

v1.route('/admin', admin);
app.route('/api/v1', v1);

export default app;
