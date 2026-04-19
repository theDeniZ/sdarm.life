/**
 * Tracks every user that has ever interacted with the bot, plus a per-user
 * mute flag for new-song notifications.
 *
 * Storage layout in the shared KV namespace:
 *   user:{chatId}   →  empty value, no TTL  (presence == "subscribed by default")
 *   mute:{chatId}   →  empty value, no TTL  (presence == "do not notify")
 *
 * Why marker keys instead of one JSON index?
 *   - No read-modify-write race when many /start events fire concurrently
 *   - kv.list({ prefix }) gives us atomic enumeration during a cron tick
 *   - Easy to scan a few hundred users in one list call (free tier limit is 1000 keys / call)
 */

const USER_PREFIX = 'user:';
const MUTE_PREFIX = 'mute:';

/** Idempotently record that a user has interacted with the bot. */
export async function recordUser(kv: KVNamespace, chatId: number): Promise<void> {
  await kv.put(`${USER_PREFIX}${chatId}`, '');
}

export async function muteUser(kv: KVNamespace, chatId: number): Promise<void> {
  await kv.put(`${MUTE_PREFIX}${chatId}`, '');
}

export async function unmuteUser(kv: KVNamespace, chatId: number): Promise<void> {
  await kv.delete(`${MUTE_PREFIX}${chatId}`);
}

export async function isUserMuted(kv: KVNamespace, chatId: number): Promise<boolean> {
  return (await kv.get(`${MUTE_PREFIX}${chatId}`)) !== null;
}

/**
 * Enumerate all known chat IDs that should receive notifications.
 * Returns the union of (all users) MINUS (muted users), sorted ascending.
 *
 * Uses prefix list — paginates internally if there are more than 1000 keys.
 */
export async function listActiveSubscribers(kv: KVNamespace): Promise<number[]> {
  const all = await listChatIdsByPrefix(kv, USER_PREFIX);
  const muted = new Set(await listChatIdsByPrefix(kv, MUTE_PREFIX));
  return all.filter((id) => !muted.has(id)).sort((a, b) => a - b);
}

async function listChatIdsByPrefix(kv: KVNamespace, prefix: string): Promise<number[]> {
  const ids: number[] = [];
  let cursor: string | undefined;
  do {
    const page: KVNamespaceListResult<unknown> = await kv.list({ prefix, cursor });
    for (const k of page.keys) {
      const id = parseInt(k.name.slice(prefix.length), 10);
      if (Number.isFinite(id)) ids.push(id);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return ids;
}
