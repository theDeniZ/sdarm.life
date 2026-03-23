import { drizzle } from 'drizzle-orm/d1';
import { subscribers } from '@sdarm/db';
import { desc, count, eq } from 'drizzle-orm';

type DB = ReturnType<typeof drizzle>;

export async function listAllSubscribers(db: DB) {
	return db.select().from(subscribers).orderBy(desc(subscribers.createdAt));
}

export async function listSubscribers(db: DB, opts: { limit?: number; offset?: number }) {
	const [items, [{ total }]] = await Promise.all([
		db.select().from(subscribers).orderBy(desc(subscribers.createdAt))
			.limit(opts.limit ?? 10_000).offset(opts.offset ?? 0),
		db.select({ total: count() }).from(subscribers),
	]);
	return { items, total };
}

export async function createSubscriber(db: DB, email: string, token: string, language: string) {
	await db.insert(subscribers).values({ email, token, language });
}

export async function unsubscribeByToken(db: DB, token: string) {
	const [sub] = await db.select().from(subscribers).where(eq(subscribers.token, token)).limit(1);
	if (!sub) return null;
	await db.delete(subscribers).where(eq(subscribers.token, token));
	return sub;
}

export async function deleteSubscriber(db: DB, id: number) {
	const [sub] = await db.delete(subscribers).where(eq(subscribers.id, id)).returning();
	return sub ?? null;
}
