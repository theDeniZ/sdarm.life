import type { Bindings } from '../../types';

/**
 * KV-backed cache for Bible content. The KV binding is shared with the rest of
 * the Worker (config, geocode), so every key is namespaced `bible:` and carries
 * a `:v1` suffix that can be bumped to bust everything at once.
 *
 * Bible text is effectively immutable, so TTLs are long — this is what keeps
 * the request volume against YouVersion low.
 */
export const BIBLE_TTL = {
  /** Admin catalog browse — new translations appear within a day. */
  catalog: 86400,
  /** Per-Bible metadata (title, abbreviation, copyright). */
  bible: 86400,
  /** Book list incl. chapter counts — large payload, rarely changes. */
  books: 604800,
  /** Chapter text. */
  chapter: 2592000,
} as const;

export const kvKey = {
  catalog: (language: string, pageToken: string) => `bible:cat:${language}:${pageToken || 'first'}:v1`,
  /** `0` is the "every license" listing; any other value narrows to one Bible. */
  licenses: (bibleId: number) => `bible:lic:${bibleId}:v1`,
  /**
   * IDs our app key is licensed for, per language — the input to the "not licensed" badge.
   *
   * Bumped to v2: until the all-or-nothing fix in `listLicensedIds`, a crawl that
   * failed part-way through cached its *partial* result here for a day, which
   * labelled every Bible in the untraversed tail "not licensed" and left the
   * operator unable to enable perfectly readable translations. Any such poisoned
   * v1 entry must not be read back.
   */
  licensedIds: (language: string) => `bible:licids:${language}:v2`,
  bible: (id: number) => `bible:v:${id}:v1`,
  books: (id: number) => `bible:v:${id}:books:v1`,
  chapter: (id: number, bookCode: string, chapter: number) => `bible:ch:${id}:${bookCode}:${chapter}:v1`,
};

export async function cacheGet<T>(env: Bindings, key: string): Promise<T | null> {
  try {
    return await env.KV.get<T>(key, 'json');
  } catch {
    return null;
  }
}

export async function cachePut(env: Bindings, key: string, value: unknown, ttl: number): Promise<void> {
  try {
    await env.KV.put(key, JSON.stringify(value), { expirationTtl: ttl });
  } catch {
    // Cache failures must never break the request path.
  }
}

/**
 * Read-through cache. `loader` returning `null` is treated as "no value" and is
 * deliberately not cached, so an upstream hiccup doesn't get pinned for a month.
 */
export async function withCache<T>(env: Bindings, key: string, ttl: number, loader: () => Promise<T | null>): Promise<T | null> {
  const hit = await cacheGet<T>(env, key);
  if (hit !== null) return hit;
  const fresh = await loader();
  if (fresh !== null) await cachePut(env, key, fresh, ttl);
  return fresh;
}
