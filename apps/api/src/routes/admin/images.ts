import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../../types';
import { listImages, insertImage, deleteImage } from '../../repositories/images';

const router = new Hono<{ Bindings: Bindings }>();

router.get('/', async (c) => {
	const db  = drizzle(c.env.DB);
	const { limit: limitQ, offset: offsetQ, unused } = c.req.query();

	const result = await listImages(db, {
		limit:      limitQ  ? parseInt(limitQ,  10) : 24,
		offset:     offsetQ ? parseInt(offsetQ, 10) : 0,
		unusedOnly: unused === '1',
	});

	return c.json(result);
});

router.delete('/', async (c) => {
	const db  = drizzle(c.env.DB);
	const key = c.req.query('key');
	if (!key) return c.json({ error: 'Missing key' }, 400);

	await Promise.all([
		c.env.IMAGES.delete(key),
		deleteImage(db, key),
	]);

	return c.json({ ok: true });
});

router.post('/upload', async (c) => {
	const db   = drizzle(c.env.DB);
	const form = await c.req.formData();
	const file = form.get('file') as File | null;

	if (!file) return c.json({ error: 'No file' }, 400);

	const ext = file.name.split('.').pop() ?? 'bin';
	const key = `uploads/${crypto.randomUUID()}.${ext}`;

	await Promise.all([
		c.env.IMAGES.put(key, file.stream(), {
			httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' },
		}),
		insertImage(db, key, file.size),
	]);

	return c.json({ key });
});

router.post('/backfill', async (c) => {
	const db      = drizzle(c.env.DB);
	const listed  = await c.env.IMAGES.list();
	let synced    = 0;

	for (const obj of listed.objects) {
		try {
			await insertImage(db, obj.key, obj.size);
			synced++;
		} catch {
			// already exists — skip
		}
	}

	return c.json({ synced });
});

export default router;
