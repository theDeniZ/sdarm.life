import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { drizzle } from 'drizzle-orm/d1';
import { posts, siteConfig, subscribers, images, KNOWN_CONFIG_KEYS } from '@sdarm/db';
import { and, isNull, eq, isNotNull, desc, count, notInArray } from 'drizzle-orm';

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
	const { featured, video, limit: limitQ, offset: offsetQ } = c.req.query();

	let filter = isNull(posts.deletedAt);
	if (featured === '1') filter = and(filter, eq(posts.isFeatured, true))!;
	if (video === '1') filter = and(filter, isNotNull(posts.videoUrl))!;

	const limit  = limitQ  ? parseInt(limitQ,  10) : undefined;
	const offset = offsetQ ? parseInt(offsetQ, 10) : 0;

	const [items, [{ total }]] = await Promise.all([
		db.select().from(posts).where(filter).orderBy(desc(posts.publishedAt))
			.limit(limit ?? 10_000).offset(offset),
		db.select({ total: count() }).from(posts).where(filter),
	]);

	return c.json({ items, total });
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

admin.get('/posts/:id', async (c) => {
	const db = drizzle(c.env.DB);
	const id = parseInt(c.req.param('id'), 10);
	const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
	if (!post) return c.json({ error: 'Not found' }, 404);
	return c.json(post);
});

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
		thumbKey?: string;
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
			thumbKey: body.thumbKey ?? null,
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
		thumbKey: string | null;
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
	if (body.thumbKey !== undefined)  update.thumbKey = body.thumbKey;
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

// ── Admin — image library ─────────────────────────────────────────────────────

admin.get('/images', async (c) => {
	const db = drizzle(c.env.DB);
	const { limit: limitQ, offset: offsetQ, unused } = c.req.query();
	const limit  = limitQ  ? parseInt(limitQ,  10) : 24;
	const offset = offsetQ ? parseInt(offsetQ, 10) : 0;
	const unusedOnly = unused === '1';

	// Fetch usage data first — needed both for labels and for unused filter
	const [postRows, configRows] = await Promise.all([
		db.select({ title: posts.title, coverKey: posts.coverKey, thumbKey: posts.thumbKey })
			.from(posts).where(isNull(posts.deletedAt)),
		db.select().from(siteConfig),
	]);

	const usage = new Map<string, { type: string; label: string }[]>();
	function addUsage(key: string | null, type: string, label: string) {
		if (!key) return;
		if (!usage.has(key)) usage.set(key, []);
		usage.get(key)!.push({ type, label });
	}
	for (const p of postRows) {
		addUsage(p.coverKey, 'post_cover', p.title);
		addUsage(p.thumbKey, 'post_thumb', p.title);
	}
	for (const cfg of configRows) {
		addUsage(cfg.value, 'config', cfg.key);
	}

	const usedKeys = [...usage.keys()];
	const filter = unusedOnly && usedKeys.length
		? notInArray(images.key, usedKeys)
		: undefined;

	const [items, [{ total }]] = await Promise.all([
		db.select().from(images).where(filter).orderBy(desc(images.uploadedAt)).limit(limit).offset(offset),
		db.select({ total: count() }).from(images).where(filter),
	]);

	return c.json({
		items: items.map((img) => ({
			key: img.key,
			size: img.size,
			uploaded: img.uploadedAt.toISOString(),
			usedIn: usage.get(img.key) ?? [],
		})),
		total,
	});
});

admin.delete('/images', async (c) => {
	const db = drizzle(c.env.DB);
	const key = c.req.query('key');
	if (!key) return c.json({ error: 'Missing key' }, 400);
	await Promise.all([
		c.env.IMAGES.delete(key),
		db.delete(images).where(eq(images.key, key)),
	]);
	return c.json({ ok: true });
});

// ── Admin — image upload ──────────────────────────────────────────────────────

admin.post('/images/upload', async (c) => {
	const db = drizzle(c.env.DB);
	const form = await c.req.formData();
	const file = form.get('file') as File | null;

	if (!file) return c.json({ error: 'No file' }, 400);

	const ext = file.name.split('.').pop() ?? 'bin';
	const key = `uploads/${crypto.randomUUID()}.${ext}`;

	await Promise.all([
		c.env.IMAGES.put(key, file.stream(), {
			httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' },
		}),
		db.insert(images).values({ key, size: file.size }),
	]);

	return c.json({ key });
});

// ── Admin — subscribers ───────────────────────────────────────────────────────

admin.get('/subscribers', async (c) => {
	const db = drizzle(c.env.DB);
	const { limit: limitQ, offset: offsetQ } = c.req.query();

	const limit  = limitQ  ? parseInt(limitQ,  10) : undefined;
	const offset = offsetQ ? parseInt(offsetQ, 10) : 0;

	const [items, [{ total }]] = await Promise.all([
		db.select().from(subscribers).orderBy(desc(subscribers.createdAt))
			.limit(limit ?? 10_000).offset(offset),
		db.select({ total: count() }).from(subscribers),
	]);

	return c.json({ items, total });
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
