/**
 * Cloudflare Worker entry point for the Breezify Telegram bot.
 *
 * The bot runs in webhook mode — Telegram POSTs every update to this Worker.
 * grammY's `webhookCallback` verifies the X-Telegram-Bot-Api-Secret-Token
 * header before processing, preventing spoofed requests.
 *
 * Setup (one-time):
 *   1. wrangler kv namespace create BOT_RATE_KV
 *      → copy the id into wrangler.jsonc
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
import type { Env } from './types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Fail fast if critical secrets are missing — misconfigured deploy
    if (!env.BOT_TOKEN) {
      console.error(JSON.stringify({ level: 'error', context: 'worker.fetch', message: 'BOT_TOKEN is not set', ts: new Date().toISOString() }));
      return new Response('Service Unavailable', { status: 503 });
    }
    if (!env.BOT_SECRET) {
      console.error(JSON.stringify({ level: 'error', context: 'worker.fetch', message: 'BOT_SECRET is not set', ts: new Date().toISOString() }));
      return new Response('Service Unavailable', { status: 503 });
    }

    // Only accept POST from Telegram
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const bot = createBot(env);

    const handler = webhookCallback(bot, 'cloudflare-mod', {
      secretToken: env.BOT_SECRET,
    });

    try {
      return await handler(request);
    } catch (err) {
      // webhookCallback only throws on verification failure or parse errors.
      // Log and return 200 so Telegram doesn't retry the same bad update.
      console.error(JSON.stringify({
        level: 'error',
        context: 'worker.fetch',
        message: err instanceof Error ? err.message : String(err),
        ts: new Date().toISOString(),
      }));
      return new Response('OK', { status: 200 });
    }
  },
};
