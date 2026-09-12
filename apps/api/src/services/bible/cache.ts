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
  /**
   * Bumped to v2: chapters parsed before the numeric-entity fix in
   * `decodeEntities` stored literal `&#34;` / `&#39;` in the verse text and
   * would keep serving it for up to 30 days.
   */
  chapter: (id: number, bookCode: string, chapter: number) => `bible:ch:${id}:${bookCode}:${chapter}:v2`,
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

/**
 * Cache generation — the takedown mechanism.
 *
 * A license can be revoked on notice, effective immediately, and an allowlist
 * edit alone does not stop the edge serving that translation's chapters: those
 * URLs are cached for a day and there are ~1,189 of them per translation, plus
 * every parallel pairing, so purge-by-URL cannot enumerate them. Instead the
 * Bible text routes fold this token into their cache key (see
 * `middleware/cache.ts`); bumping it strands every stored entry at once.
 *
 * The token is read from KV, but memoised per isolate so an edge hit does not
 * pay a KV read. That memo is what bounds the takedown: an isolate already
 * holding the old token keeps serving the old entries until its memo expires.
 * **The honest figure to quote a rights holder is therefore one minute, not
 * instant** — and not the 24 hours it would be without this.
 */
const GENERATION_KEY = 'bible:cachegen';
const GENERATION_MEMO_MS = 60_000;

let generationMemo: { value: string; expires: number } | null = null;

export async function getCacheGeneration(env: Bindings): Promise<string> {
  const now = Date.now();
  if (generationMemo && generationMemo.expires > now) return generationMemo.value;
  // A failed read must not invent a new generation: that would strand the whole
  // cache on a transient KV blip. Falling back to '0' only risks serving the
  // pre-bump entries a little longer, which is the same failure the memo has.
  const value = (await env.KV.get(GENERATION_KEY).catch(() => null)) ?? '0';
  generationMemo = { value, expires: now + GENERATION_MEMO_MS };
  return value;
}

/**
 * Strand every cached Bible response. Call after any change to what the public
 * may see: the allowlist, a takedown, or a license record (the license object
 * is embedded in every chapter response, so editing a notice changes them all).
 */
export async function bumpCacheGeneration(env: Bindings): Promise<void> {
  const next = String(Date.now());
  try {
    await env.KV.put(GENERATION_KEY, next);
    generationMemo = { value: next, expires: Date.now() + GENERATION_MEMO_MS };
  } catch {
    // A cache that cannot be stranded is a stale cache, not a broken request.
  }
}
