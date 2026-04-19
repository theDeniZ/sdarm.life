/**
 * New-song notification broadcast — runs on a cron tick (every 10 min).
 *
 * Flow:
 *   1. Fetch the latest N songs from the API (created_at DESC).
 *   2. Compare with `notify:last_seen_id` in KV.
 *      - First-ever run: just record the highest id, send nothing.
 *        (We don't want every existing song to flood every user.)
 *      - Subsequent runs: songs with id > last_seen_id are "new"; broadcast each.
 *   3. Update `notify:last_seen_id` to the highest id we saw.
 *
 * The audience is everyone in the `user:` set minus everyone in the `mute:` set.
 * A failed send (user blocked the bot, deactivated account, etc.) is logged and
 * skipped — we never throw out of the loop.
 */

import { Bot, InlineKeyboard } from 'grammy';
import type { ApiClient } from './api';
import { listActiveSubscribers } from './users';
import { STR } from './i18n';
import { logError } from './logger';
import { esc } from './format';

const LAST_SEEN_KEY = 'notify:last_seen_id';
const RECENT_FETCH_LIMIT = 20;
/** Telegram allows ~30 messages/sec to different users — we sleep between sends to stay safe. */
const PER_SEND_DELAY_MS = 40;

interface RecentSong {
  id: number;
  number: number;
  title: string;
  author: string | null;
  songbook: { id: number; title: string; slug: string };
}

export async function runNotifyCron(
  bot: Bot,
  api: ApiClient,
  kv: KVNamespace,
  webUrl: string,
): Promise<void> {
  const recent = (await api.getRecentSongs(RECENT_FETCH_LIMIT)) as RecentSong[];
  if (recent.length === 0) return;

  const highestId = Math.max(...recent.map((s) => s.id));
  const lastSeenRaw = await kv.get(LAST_SEEN_KEY);
  const lastSeenId = lastSeenRaw === null ? null : parseInt(lastSeenRaw, 10);

  // First-ever run: baseline only, no broadcast.
  if (lastSeenId === null || !Number.isFinite(lastSeenId)) {
    await kv.put(LAST_SEEN_KEY, String(highestId));
    return;
  }

  const fresh = recent.filter((s) => s.id > lastSeenId).sort((a, b) => a.id - b.id);
  if (fresh.length === 0) return;

  const subscribers = await listActiveSubscribers(kv);
  if (subscribers.length === 0) {
    // No one to notify — still advance the watermark so we don't keep re-detecting these.
    await kv.put(LAST_SEEN_KEY, String(highestId));
    return;
  }

  for (const song of fresh) {
    await broadcastSong(bot, song, subscribers, webUrl);
  }

  await kv.put(LAST_SEEN_KEY, String(highestId));
}

async function broadcastSong(
  bot: Bot,
  song: RecentSong,
  subscribers: number[],
  webUrl: string,
): Promise<void> {
  const text = formatNewSongMessage(song);
  const songUrl = `${webUrl}/en/songbooks/${encodeURIComponent(song.songbook.slug)}/${song.id}?embed=1`;
  const kb = new InlineKeyboard()
    .webApp(STR.btn_open_song, songUrl)
    .row()
    .text(STR.btn_mute_notifications, 'notify_mute');

  for (const chatId of subscribers) {
    try {
      await bot.api.sendMessage(chatId, text, { parse_mode: 'MarkdownV2', reply_markup: kb });
    } catch (err) {
      // 403 = user blocked / deactivated. Don't auto-mute (might be transient) — just log.
      logError('notify.send', err, { chatId, songId: song.id });
    }
    if (PER_SEND_DELAY_MS > 0) await new Promise((r) => setTimeout(r, PER_SEND_DELAY_MS));
  }
}

function formatNewSongMessage(song: RecentSong): string {
  const lines = [
    `*${STR.notify_new_song_header}*`,
    '',
    `*№${song.number} · ${esc(song.title)}*`,
    `_${esc(song.songbook.title)}_`,
  ];
  if (song.author) lines.push(`_by ${esc(song.author)}_`);
  return lines.join('\n');
}
