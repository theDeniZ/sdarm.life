import { drizzle } from 'drizzle-orm/d1';
import { posts } from '@sdarm/db';
import { and, isNull, eq, isNotNull, desc, count } from 'drizzle-orm';

type DB = ReturnType<typeof drizzle>;

export async function listPosts(db: DB, opts: {
	featured?: boolean;
	video?: boolean;
	limit?: number;
	offset?: number;
}) {
	let filter = isNull(posts.deletedAt);
	if (opts.featured) filter = and(filter, eq(posts.isFeatured, true))!;
	if (opts.video)    filter = and(filter, isNotNull(posts.videoUrl))!;

	const [items, [{ total }]] = await Promise.all([
		db.select().from(posts).where(filter).orderBy(desc(posts.publishedAt))
			.limit(opts.limit ?? 10_000).offset(opts.offset ?? 0),
		db.select({ total: count() }).from(posts).where(filter),
	]);

	return { items, total };
}

export async function getPostBySlug(db: DB, slug: string) {
	const [post] = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1);
	return post ?? null;
}

export async function getPostById(db: DB, id: number) {
	const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
	return post ?? null;
}

export async function createPost(db: DB, data: {
	title: string;
	slug: string;
	excerpt?: string | null;
	body?: string | null;
	author?: string | null;
	videoUrl?: string | null;
	coverKey?: string | null;
	coverAlt?: string | null;
	thumbKey?: string | null;
	isFeatured?: boolean;
	publishedAt?: string | null;
}) {
	const [post] = await db.insert(posts).values({
		title:       data.title,
		slug:        data.slug,
		excerpt:     data.excerpt     ?? null,
		body:        data.body        ?? null,
		author:      data.author      ?? null,
		videoUrl:    data.videoUrl    ?? null,
		coverKey:    data.coverKey    ?? null,
		coverAlt:    data.coverAlt    ?? null,
		thumbKey:    data.thumbKey    ?? null,
		isFeatured:  data.isFeatured  ?? false,
		publishedAt: data.publishedAt ? new Date(data.publishedAt) : new Date(),
	}).returning();
	return post;
}

export async function updatePost(db: DB, id: number, data: Partial<{
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
}>) {
	const update: Record<string, unknown> = { updatedAt: new Date() };
	if (data.title      !== undefined) update.title      = data.title;
	if (data.slug       !== undefined) update.slug       = data.slug;
	if (data.excerpt    !== undefined) update.excerpt    = data.excerpt;
	if ('body' in data)                update.body       = data.body;
	if (data.author     !== undefined) update.author     = data.author;
	if (data.videoUrl   !== undefined) update.videoUrl   = data.videoUrl;
	if (data.coverKey   !== undefined) update.coverKey   = data.coverKey;
	if (data.coverAlt   !== undefined) update.coverAlt   = data.coverAlt;
	if (data.thumbKey   !== undefined) update.thumbKey   = data.thumbKey;
	if (data.isFeatured !== undefined) update.isFeatured = data.isFeatured;
	if (data.publishedAt !== undefined) update.publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;
	if (data.deletedAt  !== undefined) update.deletedAt  = data.deletedAt ? new Date(data.deletedAt) : null;

	const [post] = await db.update(posts).set(update).where(eq(posts.id, id)).returning();
	return post ?? null;
}

export async function softDeletePost(db: DB, id: number) {
	const [post] = await db.update(posts)
		.set({ deletedAt: new Date(), updatedAt: new Date() })
		.where(and(eq(posts.id, id), isNull(posts.deletedAt)))
		.returning();
	return post ?? null;
}
