/**
 * Minimal HTTP admin surface for the bot.
 *
 * Exposed under /admin/*, gated by a bearer token (env.ADMIN_TOKEN if set,
 * else env.BOT_SECRET). Every response is JSON.
 *
 * Endpoints:
 *   GET  /admin/notify/status      → current watermark + subscriber counts
 *   POST /admin/notify/run         → run the notify cron right now (respects
 *                                    the current watermark). Optional query
 *                                    `fromId=N` rewinds the watermark to N-1
 *                                    first, so all songs with id ≥ N get
 *                                    broadcast on this run.
 *
 * Why: after direct-D1 song inserts (bypassing the admin API) OR if the very
 * first cron tick happened between inserts — the watermark can silently
 * catch up with new songs, leaving nothing to broadcast. This endpoint is
 * the escape hatch that bypasses the every-10-min cron cadence.
 */

import { Bot } from 'grammy';
import { createApiClient } from './api';
import { runNotifyCron } from './notify';
import { listActiveSubscribers } from './users';
import type { Env } from './types';

const LAST_SEEN_KEY = 'notify:last_seen_id';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function authorized(request: Request, env: Env): boolean {
  const token = env.ADMIN_TOKEN || env.BOT_SECRET;
  if (!token) return false;
  const header = request.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return !!match && match[1] === token;
}

async function handleStatus(env: Env): Promise<Response> {
  const watermarkRaw = await env.RATE_KV.get(LAST_SEEN_KEY);
  const subscribers = await listActiveSubscribers(env.RATE_KV);

  // Peek at the API to show the current highest song id alongside the watermark
  const api = createApiClient(env.API_URL ?? 'https://api.sdarm.life/api/v1');
  let recentHighestId: number | null = null;
  try {
    const recent = (await api.getRecentSongs(1)) as Array<{ id: number }>;
    if (recent.length > 0) recentHighestId = recent[0].id;
  } catch {
    // silent — status should still work if the API is down
  }

  return json({
    watermark: watermarkRaw === null ? null : Number(watermarkRaw),
    recentHighestId,
    subscribers: subscribers.length,
  });
}

async function handleRun(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const url = new URL(request.url);
  const fromIdRaw = url.searchParams.get('fromId');

  if (fromIdRaw !== null) {
    const fromId = Number(fromIdRaw);
    if (!Number.isFinite(fromId) || fromId < 1) {
      return json({ error: 'fromId must be a positive integer' }, 400);
    }
    // Rewind the watermark so songs with id >= fromId are "fresh" on this run
    await env.RATE_KV.put(LAST_SEEN_KEY, String(fromId - 1));
  }

  const bot = new Bot(env.BOT_TOKEN);
  const api = createApiClient(env.API_URL ?? 'https://api.sdarm.life/api/v1');
  const webUrl = env.WEB_URL ?? 'https://songs.sdarm.life';

  const before = await env.RATE_KV.get(LAST_SEEN_KEY);
  await runNotifyCron(bot, api, env.RATE_KV, webUrl);
  const after = await env.RATE_KV.get(LAST_SEEN_KEY);

  // Keep the Worker alive until all sendMessage retries settle
  ctx.waitUntil(Promise.resolve());

  return json({
    watermark: { before: before === null ? null : Number(before), after: after === null ? null : Number(after) },
    rewoundTo: fromIdRaw !== null ? Number(fromIdRaw) - 1 : null,
  });
}

/**
 * Entry point — returns null when the request path isn't /admin/*, letting
 * the caller fall through to the Telegram webhook handler.
 */
export async function handleAdmin(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/admin/')) return null;

  if (!authorized(request, env)) {
    return json({ error: 'unauthorized' }, 401);
  }

  if (url.pathname === '/admin/notify/status' && request.method === 'GET') {
    return handleStatus(env);
  }
  if (url.pathname === '/admin/notify/run' && request.method === 'POST') {
    return handleRun(request, env, ctx);
  }

  return json({ error: 'not found' }, 404);
}
