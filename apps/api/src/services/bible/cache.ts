import type { Bindings } from '../../types';

// KV-backed cache for Bible content. The KV binding is shared with the rest of
// the worker (config, geocode); we namespace all Bible-related keys with the
// `bible:` prefix and append a `:v1` suffix so we can bust later by bumping
// the version.

export const BIBLE_KV_TTL = {
	translationList: 86400, // 1 day
	bookList: 604800, // 7 days
	chapter: 2592000, // 30 days
	fallback: 3600, // 1 hour — applied when we serve from D1, so we re-try YV soon
} as const;

export function kvKeyTranslationList(): string {
	return 'bible:tr:list:v1';
}

export function kvKeyBookList(translationCode: string): string {
	return `bible:tr:${translationCode}:books:v1`;
}

export function kvKeyChapter(translationCode: string, bookCode: string, chapter: number): string {
	return `bible:ch:${translationCode}:${bookCode}:${chapter}:v1`;
}

export function kvKeyParallel(codeA: string, codeB: string, bookCode: string, chapter: number): string {
	return `bible:par:${codeA}:${codeB}:${bookCode}:${chapter}:v1`;
}

export function kvKeyTranslation(code: string): string {
	return `bible:tr:${code}:v1`;
}

export function kvKeyBook(translationCode: string, bookCode: string): string {
	return `bible:tr:${translationCode}:book:${bookCode}:v1`;
}

export async function cacheGetJson<T>(env: Bindings, key: string): Promise<T | null> {
	try {
		const raw = await env.KV.get(key);
		if (!raw) return null;
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

export async function cachePutJson(env: Bindings, key: string, value: unknown, ttlSeconds: number): Promise<void> {
	try {
		await env.KV.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
	} catch {
		// silent — cache failures must never break the request path
	}
}

/**
 * Read-through cache helper. Returns the cached value (with `cached: true`)
 * if present, otherwise calls `loader`, caches the result, and returns it.
 *
 * `loader` may return `null` to indicate "no value" — we do NOT cache nulls so
 * upstream errors don't get stuck.
 */
export async function withKvCache<T>(
	env: Bindings,
	key: string,
	ttl: number,
	loader: () => Promise<T | null>,
): Promise<{ value: T | null; cached: boolean }> {
	const hit = await cacheGetJson<T>(env, key);
	if (hit !== null) return { value: hit, cached: true };
	const fresh = await loader();
	if (fresh !== null) await cachePutJson(env, key, fresh, ttl);
	return { value: fresh, cached: false };
}
