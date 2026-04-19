/**
 * Short-lived KV store for callback payloads that don't fit into Telegram's
 * 64-byte `callback_data` limit (a UTF-8 cyrillic search query overflows easily).
 *
 * Pattern:
 *   1. Before sending an inline button, store the payload → get back an 8-char id
 *   2. Embed that id in `callback_data` (`gs:{id}` etc.)
 *   3. On callback, look the payload back up
 *
 * KV key:  cb:{id}
 * TTL:     1 hour — long enough for a user to tap a follow-up button,
 *                   short enough to bound storage growth.
 */

const TTL_SECONDS = 60 * 60;

export async function storeCallbackPayload(kv: KVNamespace, payload: string): Promise<string> {
  const id = crypto.randomUUID().slice(0, 8); // 8 hex chars — ample entropy for 1h TTL
  await kv.put(`cb:${id}`, payload, { expirationTtl: TTL_SECONDS });
  return id;
}

export async function readCallbackPayload(kv: KVNamespace, id: string): Promise<string | null> {
  return kv.get(`cb:${id}`);
}
