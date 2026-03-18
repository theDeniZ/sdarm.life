import { drizzle } from 'drizzle-orm/d1';
import { images, posts } from '@sdarm/db';
import { isNull, eq, desc, count, notInArray } from 'drizzle-orm';

type DB = ReturnType<typeof drizzle>;

export async function listImages(db: DB, kv: KVNamespace, opts: {
	limit?: number;
	offset?: number;
	unusedOnly?: boolean;
}) {
	const [postRows, config] = await Promise.all([
		db.select({ title: posts.title, coverKey: posts.coverKey, thumbKey: posts.thumbKey })
			.from(posts).where(isNull(posts.deletedAt)),
		kv.get<Record<string, string | null>>('config', 'json'),
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
	if (config) {
		for (const [k, v] of Object.entries(config)) {
			addUsage(v, 'config', k);
		}
	}

	const usedKeys = [...usage.keys()];
	const filter = opts.unusedOnly && usedKeys.length
		? notInArray(images.key, usedKeys)
		: undefined;

	const limit  = opts.limit  ?? 24;
	const offset = opts.offset ?? 0;

	const [items, [{ total }]] = await Promise.all([
		db.select().from(images).where(filter).orderBy(desc(images.uploadedAt)).limit(limit).offset(offset),
		db.select({ total: count() }).from(images).where(filter),
	]);

	return {
		items: items.map((img) => ({
			key:    img.key,
			size:   img.size,
			uploaded: img.uploadedAt.toISOString(),
			usedIn: usage.get(img.key) ?? [],
		})),
		total,
	};
}

export async function insertImage(db: DB, key: string, size: number) {
	await db.insert(images).values({ key, size });
}

export async function deleteImage(db: DB, key: string) {
	await db.delete(images).where(eq(images.key, key));
}
