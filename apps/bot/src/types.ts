export interface Env {
  /** Telegram Bot API token from @BotFather */
  BOT_TOKEN: string;
  /** Shared secret that Telegram sends in X-Telegram-Bot-Api-Secret-Token header */
  BOT_SECRET: string;
  /** KV namespace used for per-user rate limiting */
  RATE_KV: KVNamespace;
  /** Base URL of the public API (default: https://api.sdarm.life/api/v1) */
  API_URL: string;
  /** Per-user requests/minute (default: 20). Set as Worker var to override. */
  RATE_LIMIT_PER_MIN?: string;
}
