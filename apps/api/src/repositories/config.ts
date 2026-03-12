import { drizzle } from 'drizzle-orm/d1';
import { siteConfig } from '@sdarm/db';

type DB = ReturnType<typeof drizzle>;

export async function getAllConfig(db: DB) {
	const rows = await db.select().from(siteConfig);
	return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function upsertConfig(db: DB, key: string, value: string | null) {
	await db.insert(siteConfig)
		.values({ key, value, updatedAt: new Date() })
		.onConflictDoUpdate({ target: siteConfig.key, set: { value, updatedAt: new Date() } });
}
