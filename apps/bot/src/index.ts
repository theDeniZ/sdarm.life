/**
 * Cloudflare Worker entry point for the Breezify Telegram bot.
 *
 * Two entry surfaces:
 *   1. fetch()      — Telegram webhook. Each Telegram update POSTs here;
 *                     grammY's `webhookCallback` validates the secret token.
 *   2. scheduled()  — Cron tick (every 10 min, configured in wrangler.jsonc).
 *                     Polls the API for new songs and broadcasts to subscribers.
 *
 * Setup (one-time):
 *   1. wrangler kv namespace create BOT_RATE_KV  → copy id into wrangler.jsonc
 *   2. wrangler secret put BOT_TOKEN
 *   3. wrangler secret put BOT_SECRET   (any random string, min 16 chars)
 *   4. wrangler deploy
 *   5. Register webhook with Telegram:
 *      curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
 *        -d "url=https://sdarm-bot.<your-subdomain>.workers.dev" \
 *        -d "secret_token=<BOT_SECRET>" \
 *        -d "allowed_updates=[\"message\",\"callback_query\"]"
 */

import { webhookCallback } from 'grammy';
import { createBot } from './bot';
import { createApiClient } from './api';
import { runNotifyCron } from './notify';
import { logError } from './logger';
import { handleAdmin } from './admin';
import type { Env } from './types';

function logFatal(context: string, message: string): void {
  console.error(JSON.stringify({ level: 'error', context, message, ts: new Date().toISOString() }));
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (!env.BOT_TOKEN) {
      logFatal('worker.fetch', 'BOT_TOKEN is not set');
      return new Response('Service Unavailable', { status: 503 });
    }
    if (!env.BOT_SECRET) {
      logFatal('worker.fetch', 'BOT_SECRET is not set');
      return new Response('Service Unavailable', { status: 503 });
    }

    // /admin/* — bearer-auth HTTP surface for status / force-notify.
    const adminResponse = await handleAdmin(request, env, ctx);
    if (adminResponse) return adminResponse;

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const bot = createBot(env);
    const handler = webhookCallback(bot, 'cloudflare-mod', { secretToken: env.BOT_SECRET });

    try {
      return await handler(request);
    } catch (err) {
      // webhookCallback only throws on verification failure or parse errors.
      // Log and return 200 so Telegram doesn't retry the same bad update.
      logFatal('worker.fetch', err instanceof Error ? err.message : String(err));
      return new Response('OK', { status: 200 });
    }
  },

  /**
   * Cron handler — runs every 10 min per wrangler.jsonc `triggers.crons`.
   * Wrapped in waitUntil so a slow notification batch doesn't block the
   * scheduled-event ack to Cloudflare.
   */
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    if (!env.BOT_TOKEN) {
      logFatal('worker.scheduled', 'BOT_TOKEN is not set — skipping cron tick');
      return;
    }
    const bot = createBot(env);
    const api = createApiClient(env.API_URL ?? 'https://api.sdarm.life/api/v1');
    const webUrl = env.WEB_URL ?? 'https://songs.sdarm.life';
    ctx.waitUntil(
      runNotifyCron(bot, api, env.RATE_KV, webUrl).catch((err) => {
        logError('cron.notify', err);
      }),
    );
  },
};
