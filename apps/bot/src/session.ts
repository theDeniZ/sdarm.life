/**
 * Lightweight session store backed by the same KV namespace as rate limiting.
 * Keys: sess:{userId}  →  JSON blob, TTL 30 days.
 * Session is best-effort — failures are silent so they never block the user.
 */

import type { Lang } from './i18n';

export interface UserSession {
  sbSlug?: string;   // last visited songbook slug
  sbTitle?: string;  // last visited songbook title (for "resume" button label)
  sbPage?: number;   // last visited page inside that songbook
  lang?: Lang;       // user's preferred interface language
}

const SESSION_TTL = 30 * 24 * 60 * 60; // 30 days

export async function getSession(kv: KVNamespace, userId: number): Promise<UserSession> {
  try {
    const raw = await kv.get(`sess:${userId}`);
    return raw ? (JSON.parse(raw) as UserSession) : {};
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
