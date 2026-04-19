/**
 * Lightweight session store backed by the same KV namespace as rate limiting.
 * Keys: sess:{userId}  →  JSON blob, TTL 30 days.
 * Session is best-effort — failures are silent so they never block the user.
 *
 * NOTE: Older session blobs may carry a `lang` field from a multi-locale era.
 * It is ignored on read (the bot is now English-only) and never written here.
 */

export interface UserSession {
  sbSlug?: string;   // last visited songbook slug
  sbTitle?: string;  // last visited songbook title (for "resume" button label)
  sbPage?: number;   // last visited page inside that songbook
}

const SESSION_TTL = 30 * 24 * 60 * 60; // 30 days

export async function getSession(kv: KVNamespace, userId: number): Promise<UserSession> {
  try {
    const raw = await kv.get(`sess:${userId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as UserSession;
    return { sbSlug: parsed.sbSlug, sbTitle: parsed.sbTitle, sbPage: parsed.sbPage };
  } catch {
    return {};
  }
}

export async function saveSession(kv: KVNamespace, userId: number, patch: Partial<UserSession>): Promise<void> {
  try {
    const prev = await getSession(kv, userId);
    await kv.put(`sess:${userId}`, JSON.stringify({ ...prev, ...patch }), { expirationTtl: SESSION_TTL });
  } catch {
    // KV write failure → silent
  }
}
