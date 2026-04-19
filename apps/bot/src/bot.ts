import { Bot, GrammyError, InlineKeyboard } from 'grammy';
import type { Context } from 'grammy';
import type { SongbookDto } from '@sdarm/types';
import type { Env } from './types';
import { createApiClient, type ApiClient } from './api';
import { isRateLimited, DEFAULT_RATE_LIMIT_PER_MINUTE } from './rate-limit';
import { getSession, saveSession } from './session';
import { STR } from './i18n';
import { logError } from './logger';
import {
  formatSong,
  formatSongList,
  formatSearchResults,
  formatInBookSearchResults,
  songHasChords,
  splitMessage,
} from './format';
import { storeCallbackPayload, readCallbackPayload } from './cb-store';
import { recordUser, isUserMuted, muteUser, unmuteUser } from './users';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Single pagination size used everywhere — songbook lists and search results alike. */
const PAGE_SIZE = 15;

/** Telegram message body cap (4096 bytes incl. MarkdownV2). */
const TG_MSG_LIMIT = 4096;

const DEFAULT_CONTACT_URL = 'https://t.me/maestr_os';
const DEFAULT_WEB_URL = 'https://songs.sdarm.life';

// Callback parameter bounds. Bounds are encoded in the regex itself so the parsed
// integer is guaranteed safe — no separate range check needed.
//   id   = up to 7 digits  →  ≤ 9_999_999
//   page = up to 4 digits  →  ≤ 9_999
const ID_DIGITS = '\\d{1,7}';
const PAGE_DIGITS = '\\d{1,4}';
const SLUG_RE = /^[a-zA-Z0-9-]{1,100}$/;
const NUMERIC_RE = /^\d{1,6}$/;
const CB_ID_RE = /^[0-9a-f]{8}$/;

// ── Keyboard builders ─────────────────────────────────────────────────────────

function mainMenuKeyboard(resume?: { title: string }): InlineKeyboard {
  const kb = new InlineKeyboard();

  if (resume) {
    const label = resume.title.length > 36 ? resume.title.slice(0, 36) + '…' : resume.title;
    kb.text(STR.btn_resume(label), 'resume').row();
  }

  // Each action on its own row — full-width buttons read better than narrow side-by-side ones
  kb.text(STR.btn_songbooks, 'sb_list').row();
  kb.text(STR.btn_search, 'search_hint').row();
  kb.text(STR.btn_settings, 'settings').row();
  kb.text(STR.btn_about, 'about');
  return kb;
}

function songbooksKeyboard(books: SongbookDto[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const b of books) {
    kb.text(`${b.title} · ${b.songCount}`, `sb:${b.slug}:0`).row();
  }
  kb.text(STR.btn_back_menu, 'main_menu');
  return kb;
}

function songsKeyboard(
  items: { id: number; number: number; title: string }[],
  slug: string,
  page: number,
  total: number,
): InlineKeyboard {
  const kb = new InlineKeyboard();
  const pages = Math.ceil(total / PAGE_SIZE);

  for (const s of items) {
    kb.text(`№${s.number} · ${s.title}`, `song:${s.id}:${page}`).row();
  }

  // Single 4-button nav row: [‹] [N/M] [›] [≡]
  // ‹ and › always render — on edge pages they route to noop so the layout
  // stays the same shape regardless of which page you're on.
  // ≡ jumps back to the songbook list (replaces the old standalone "Songbooks" row).
  const hasPrev = page > 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;
  kb.row()
    .text('‹', hasPrev ? `sb:${slug}:${page - 1}` : 'noop')
    .text(`${page + 1}/${pages}`, 'noop')
    .text('›', hasNext ? `sb:${slug}:${page + 1}` : 'noop')
    .text('↑', 'sb_list');
  return kb;
}

/**
 * Keyboard shown below a song.
 * @param songId      ID of the current song (for chord toggle callback).
 * @param showChords  Whether chords are currently visible.
 * @param hasChords   Whether the song actually has chord annotations at all.
 */
function songKeyboard(
  songbookSlug: string,
  page: number,
  songId: number,
  showChords: boolean,
  hasChords: boolean,
  songUrl: string | null,
): InlineKeyboard {
  // Single icon row beneath the song.
  // With chords:    [ ♫ / ♫✓ ] [ ‹ ] [ ↑ ] [ □ ]
  // Without chords:            [ ‹ ] [ ↑ ] [ □ ]
  //   ♫  → beamed eighth notes — the universal "music" icon
  //        (tap to show chords; becomes ♫✓ when chords are currently on)
  //   ‹  → back to song list of this songbook
  //   ↑  → up to the songbook list
  //   □  → open the song full-screen as a Telegram Mini App
  const kb = new InlineKeyboard();

  if (hasChords) {
    const next = showChords ? 0 : 1;
    kb.text(showChords ? '♫✓' : '♫', `chord:${songId}:${page}:${next}`);
  }
  kb.text('‹', `sb:${songbookSlug}:${page}`);
  kb.text('↑', 'sb_list');
  if (songUrl) kb.webApp('□', songUrl);

  return kb;
}

function searchResultsKeyboard(items: { id: number; number: number; title: string }[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const s of items) {
    kb.text(`№${s.number} · ${s.title}`, `song:${s.id}:0`).row();
  }
  kb.text(STR.btn_back_menu, 'main_menu');
  return kb;
}

function aboutKeyboard(contactUrl: string): InlineKeyboard {
  return new InlineKeyboard()
    .url(STR.btn_contact_link, contactUrl)
    .row()
    .text(STR.btn_back_menu, 'main_menu');
}

async function showAbout(ctx: Context, contactUrl: string): Promise<void> {
  await editOrReply(ctx, STR.about_body, {
    parse_mode: 'MarkdownV2',
    reply_markup: aboutKeyboard(contactUrl),
  });
}

function settingsKeyboard(muted: boolean): InlineKeyboard {
  return new InlineKeyboard()
    .text(muted ? STR.btn_unmute_notifications : STR.btn_mute_notifications, 'notify_toggle')
    .row()
    .text(STR.btn_back_menu, 'main_menu');
}

async function showSettings(ctx: Context, kv: KVNamespace): Promise<void> {
  const userId = ctx.from?.id;
  const muted = userId ? await isUserMuted(kv, userId) : false;
  const body = `${STR.settings_body}\n\n${STR.notify_status(!muted)}`;
  await editOrReply(ctx, body, {
    parse_mode: 'MarkdownV2',
    reply_markup: settingsKeyboard(muted),
  });
}

// ── Screen renderers ──────────────────────────────────────────────────────────

async function showMainMenu(ctx: Context, api: ApiClient, kv: KVNamespace): Promise<void> {
  const userId = ctx.from?.id;
  const session = userId ? await getSession(kv, userId) : {};
  const resume = session.sbSlug && session.sbTitle ? { title: session.sbTitle } : undefined;

  // Stats line — single cached API call. Silent fallback if the API is down.
  let stats = '';
  try {
    const books = await api.getSongbooks();
    if (books.length > 0) {
      const total = books.reduce((sum, b) => sum + b.songCount, 0);
      stats = `\n${STR.welcome_stats(books.length, total)}`;
    }
  } catch {
    // Welcome should still render if /songbooks errors out
  }

  const text = `${STR.welcome_header}${stats}\n\n${STR.welcome_cta}`;

  await editOrReply(ctx, text, {
    parse_mode: 'MarkdownV2',
    reply_markup: mainMenuKeyboard(resume),
  });
}

async function showSongbooks(ctx: Context, api: ApiClient): Promise<void> {
  const books = await api.getSongbooks();
  const text = books.length === 0 ? STR.songbooks_empty : STR.songbooks_header;
  await editOrReply(ctx, text, {
    parse_mode: 'MarkdownV2',
    reply_markup: songbooksKeyboard(books),
  });
}

async function showSongs(
  ctx: Context,
  api: ApiClient,
  kv: KVNamespace,
  slug: string,
  page: number,
): Promise<void> {
  const offset = page * PAGE_SIZE;
  const [songbook, { items, total }] = await Promise.all([
    api.getSongbook(slug),
    api.getSongs(slug, { limit: PAGE_SIZE, offset }),
  ]);

  if (items.length === 0) {
    await editOrReply(ctx, STR.no_songs, { parse_mode: 'MarkdownV2' });
    return;
  }

  const userId = ctx.from?.id;
  if (userId) {
    saveSession(kv, userId, { sbSlug: slug, sbTitle: songbook.title, sbPage: page }).catch(() => {});
  }

  await editOrReply(ctx, formatSongList(items, songbook, page, total, PAGE_SIZE, STR), {
    parse_mode: 'MarkdownV2',
    reply_markup: songsKeyboard(items, slug, page, total),
  });
}

/**
 * Open a song. Always edits in place (when triggered by a callback) so the
 * chat doesn't grow with every tap — the songbook list message becomes the
 * song, and tapping back turns it into the list again.
 *
 * Short songs (≤ TG_MSG_LIMIT) fit in the single edited message.
 * Long songs: edit current message with the first chunk + keyboard, then
 * post chunks 2..N as new messages (no keyboard) below. Toggle is disabled
 * for long songs since we can't atomically edit a multi-message render.
 */
async function showSong(
  ctx: Context,
  api: ApiClient,
  id: number,
  backPage: number,
  webUrl: string | null,
  showChords = false,
): Promise<void> {
  const song = await api.getSong(id);
  const text = formatSong(song, STR, showChords);
  const hasChords = songHasChords(song);
  const songUrl = webUrl
    ? `${webUrl}/en/songbooks/${encodeURIComponent(song.songbook.slug)}/${song.id}?embed=1`
    : null;

  if (text.length <= TG_MSG_LIMIT) {
    await editOrReply(ctx, text, {
      parse_mode: 'MarkdownV2',
      reply_markup: songKeyboard(song.songbook.slug, backPage, song.id, showChords, hasChords, songUrl),
    });
    return;
  }

  // Long song: edit current → first chunk with full keyboard; then reply tail chunks.
  // Tail messages are orphan in chat (no keyboard); the website button on the first
  // chunk is the recommended escape hatch for actually reading the whole thing.
  const chunks = splitMessage(text, TG_MSG_LIMIT);
  await editOrReply(ctx, chunks[0], {
    parse_mode: 'MarkdownV2',
    reply_markup: songKeyboard(song.songbook.slug, backPage, song.id, false, false, songUrl),
  });
  for (let i = 1; i < chunks.length; i++) {
    await ctx.reply(chunks[i], { parse_mode: 'MarkdownV2' });
  }
}

async function showSearch(ctx: Context, api: ApiClient, query: string): Promise<void> {
  const trimmed = query.trim().slice(0, 100);
  if (!trimmed) {
    await editOrReply(ctx, STR.search_prompt, { parse_mode: 'MarkdownV2' });
    return;
  }

  const { items, total } = await api.searchSongs(trimmed, { limit: PAGE_SIZE });
  const text = formatSearchResults(items, trimmed, total, STR);
  const kb =
    items.length > 0 ? searchResultsKeyboard(items) : new InlineKeyboard().text(STR.btn_back_menu, 'main_menu');

  await editOrReply(ctx, text, { parse_mode: 'MarkdownV2', reply_markup: kb });
}

/**
 * Context-aware numeric search inside the user's currently-active songbook.
 * Returns true when results were found and rendered; false to let the caller
 * fall back to a global search.
 *
 * The "search globally" button stores its query in KV (via cb-store) instead
 * of inlining it in `callback_data`, since UTF-8 queries can blow past
 * Telegram's 64-byte callback limit.
 */
async function showNumericSearchInBook(
  ctx: Context,
  api: ApiClient,
  kv: KVNamespace,
  slug: string,
  bookTitle: string,
  number: string,
): Promise<boolean> {
  const { items, total } = await api.getSongs(slug, { q: number, limit: PAGE_SIZE });
  if (items.length === 0) return false;

  const cbId = await storeCallbackPayload(kv, number);
  const kb = new InlineKeyboard();
  for (const s of items) kb.text(`№${s.number} · ${s.title}`, `song:${s.id}:0`).row();
  kb.text(STR.btn_search_global, `gs:${cbId}`).row();
  kb.text('‹', `sb:${slug}:0`).text(STR.btn_back_menu, 'main_menu');

  await ctx.reply(formatInBookSearchResults(items, number, bookTitle, total, STR), {
    parse_mode: 'MarkdownV2',
    reply_markup: kb,
  });
  return true;
}

// ── Utilities ────────────────────────────────────────────────────────────────

/** True when a Telegram error is the harmless "message is not modified" 400. */
function isNotModifiedError(err: unknown): boolean {
  return err instanceof GrammyError && err.description.includes('message is not modified');
}

async function editOrReply(
  ctx: Context,
  text: string,
  extra: { parse_mode?: 'MarkdownV2'; reply_markup?: InlineKeyboard },
): Promise<void> {
  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, extra);
    } catch (err) {
      if (!isNotModifiedError(err)) throw err;
    }
  } else {
    await ctx.reply(text, extra);
  }
}

// ── Bot factory ───────────────────────────────────────────────────────────────

export function createBot(env: Env): Bot {
  const bot = new Bot(env.BOT_TOKEN);
  const api = createApiClient(env.API_URL ?? 'https://api.sdarm.life/api/v1');
  const kv = env.RATE_KV;
  const contactUrl = env.CONTACT_URL ?? DEFAULT_CONTACT_URL;
  const webUrl = env.WEB_URL ?? DEFAULT_WEB_URL;
  const rateLimit = (() => {
    const raw = parseInt(env.RATE_LIMIT_PER_MIN ?? '', 10);
    return Number.isFinite(raw) && raw > 0 && raw <= 10_000 ? raw : DEFAULT_RATE_LIMIT_PER_MINUTE;
  })();

  // ── Security: ignore other bots ───────────────────────────────────────────
  bot.use(async (ctx, next) => {
    if (ctx.from?.is_bot) return;
    return next();
  });

  // ── Rate-limit middleware ──────────────────────────────────────────────────
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return next();
    try {
      const limited = await isRateLimited(kv, userId, rateLimit);
      if (limited) {
        await ctx.reply(STR.rate_limit, { parse_mode: 'MarkdownV2' });
        return;
      }
    } catch (err) {
      logError('rate-limit-middleware', err);
    }
    return next();
  });

  // ── Commands ───────────────────────────────────────────────────────────────

  bot.command('start', async (ctx) => {
    // Track this user as a notification subscriber (idempotent).
    const userId = ctx.from?.id;
    if (userId) recordUser(kv, userId).catch((err) => logError('recordUser', err, { userId }));
    await showMainMenu(ctx, api, kv);
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(STR.help, { parse_mode: 'MarkdownV2' });
  });

  bot.command('about', async (ctx) => {
    await showAbout(ctx, contactUrl);
  });

  bot.command('settings', async (ctx) => {
    await showSettings(ctx, kv);
  });

  bot.command('songbooks', async (ctx) => {
    try {
      await showSongbooks(ctx, api);
    } catch (err) {
      logError('cmd:songbooks', err, { userId: ctx.from?.id });
      await ctx.reply(STR.err_books, { parse_mode: 'MarkdownV2' });
    }
  });

  bot.command('search', async (ctx) => {
    const query = ctx.match?.trim() ?? '';
    if (!query) {
      await ctx.reply(STR.search_prompt, { parse_mode: 'MarkdownV2' });
      return;
    }
    try {
      await showSearch(ctx, api, query);
    } catch (err) {
      logError('cmd:search', err, { userId: ctx.from?.id, query });
      await ctx.reply(STR.err_search, { parse_mode: 'MarkdownV2' });
    }
  });

  // ── Plain text → context-aware search ────────────────────────────────────
  bot.on('message:text', async (ctx) => {
    if (ctx.chat?.type !== 'private') return;
    const text = ctx.message.text.trim();
    if (text.startsWith('/')) return;

    if (text.length < 2) {
      await ctx.reply(STR.min_chars, { parse_mode: 'MarkdownV2' });
      return;
    }

    try {
      // If the user is browsing a songbook AND typed a pure number,
      // search within that songbook first; fall back to global if empty.
      const userId = ctx.from?.id;
      if (userId && NUMERIC_RE.test(text)) {
        const session = await getSession(kv, userId);
        if (session.sbSlug && session.sbTitle) {
          const handled = await showNumericSearchInBook(ctx, api, kv, session.sbSlug, session.sbTitle, text);
          if (handled) return;
        }
      }
      await showSearch(ctx, api, text);
    } catch (err) {
      logError('text:search', err, { userId: ctx.from?.id, text });
      await ctx.reply(STR.err_search, { parse_mode: 'MarkdownV2' });
    }
  });

  // ── Callback queries ───────────────────────────────────────────────────────

  bot.callbackQuery('main_menu', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showMainMenu(ctx, api, kv);
  });

  bot.callbackQuery('about', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showAbout(ctx, contactUrl);
  });

  bot.callbackQuery('settings', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showSettings(ctx, kv);
  });

  // notify_toggle — flip mute state from the Settings page
  bot.callbackQuery('notify_toggle', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.answerCallbackQuery();
      return;
    }
    const muted = await isUserMuted(kv, userId);
    if (muted) {
      await unmuteUser(kv, userId);
      await ctx.answerCallbackQuery({ text: 'Notifications enabled' });
    } else {
      await muteUser(kv, userId);
      await ctx.answerCallbackQuery({ text: 'Notifications muted' });
    }
    await showSettings(ctx, kv);
  });

  // notify_mute — quick mute from a notification message itself
  bot.callbackQuery('notify_mute', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.answerCallbackQuery();
      return;
    }
    await muteUser(kv, userId);
    await ctx.answerCallbackQuery({ text: 'Notifications muted' });
    await ctx.reply(STR.notify_muted_confirm, { parse_mode: 'MarkdownV2' });
  });

  bot.callbackQuery('sb_list', async (ctx) => {
    await ctx.answerCallbackQuery();
    try {
      await showSongbooks(ctx, api);
    } catch (err) {
      logError('cb:sb_list', err, { userId: ctx.from?.id });
      await ctx.reply(STR.err_books, { parse_mode: 'MarkdownV2' });
    }
  });

  bot.callbackQuery('resume', async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    try {
      const session = await getSession(kv, userId);
      if (session.sbSlug && SLUG_RE.test(session.sbSlug)) {
        const page = Math.min(Math.max(session.sbPage ?? 0, 0), 9999);
        await showSongs(ctx, api, kv, session.sbSlug, page);
      } else {
        await showMainMenu(ctx, api, kv);
      }
    } catch (err) {
      logError('cb:resume', err, { userId });
      await showMainMenu(ctx, api, kv);
    }
  });

  bot.callbackQuery('search_hint', async (ctx) => {
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, STR.search_hint, {
      parse_mode: 'MarkdownV2',
      reply_markup: new InlineKeyboard().text(STR.btn_back_menu, 'main_menu'),
    });
  });

  bot.callbackQuery('noop', async (ctx) => {
    await ctx.answerCallbackQuery();
  });

  // gs:{cbId} — explicit "search globally" button from in-book numeric results.
  // Query is stored in KV under a short id (UTF-8 queries don't fit in 64-byte callback_data).
  bot.callbackQuery(/^gs:([0-9a-f]{8})$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const cbId = ctx.match[1];
    if (!CB_ID_RE.test(cbId)) return;
    try {
      const query = await readCallbackPayload(kv, cbId);
      if (!query) {
        await ctx.reply(STR.search_prompt, { parse_mode: 'MarkdownV2' });
        return;
      }
      await showSearch(ctx, api, query);
    } catch (err) {
      logError('cb:gs', err, { userId: ctx.from?.id, cbId });
      await ctx.reply(STR.err_search, { parse_mode: 'MarkdownV2' });
    }
  });

  // sb:{slug}:{page}
  bot.callbackQuery(new RegExp(`^sb:([^:]+):(${PAGE_DIGITS})$`), async (ctx) => {
    await ctx.answerCallbackQuery();
    const slug = ctx.match[1];
    if (!SLUG_RE.test(slug)) return;
    const page = parseInt(ctx.match[2], 10);
    try {
      await showSongs(ctx, api, kv, slug, page);
    } catch (err) {
      logError('cb:sb', err, { userId: ctx.from?.id, slug, page });
      await ctx.reply(STR.err_songs, { parse_mode: 'MarkdownV2' });
    }
  });

  // song:{id}:{page}  — opens song as a NEW message
  bot.callbackQuery(new RegExp(`^song:(${ID_DIGITS}):(${PAGE_DIGITS})$`), async (ctx) => {
    await ctx.answerCallbackQuery();
    const id = parseInt(ctx.match[1], 10);
    const backPage = parseInt(ctx.match[2], 10);
    if (id < 1) return;
    try {
      await showSong(ctx, api, id, backPage, webUrl, false);
    } catch (err) {
      logError('cb:song', err, { userId: ctx.from?.id, songId: id });
      await ctx.reply(STR.err_song, { parse_mode: 'MarkdownV2' });
    }
  });

  // chord:{id}:{page}:{0|1}  — toggle chords by EDITING the current song message
  bot.callbackQuery(new RegExp(`^chord:(${ID_DIGITS}):(${PAGE_DIGITS}):(0|1)$`), async (ctx) => {
    await ctx.answerCallbackQuery();
    const id = parseInt(ctx.match[1], 10);
    const backPage = parseInt(ctx.match[2], 10);
    if (id < 1) return;
    const showChords = ctx.match[3] === '1';
    try {
      const song = await api.getSong(id);
      const text = formatSong(song, STR, showChords);
      const hasChords = songHasChords(song);
      const songUrl = webUrl
        ? `${webUrl}/en/songbooks/${encodeURIComponent(song.songbook.slug)}/${song.id}?embed=1`
        : null;
      await ctx.editMessageText(text, {
        parse_mode: 'MarkdownV2',
        reply_markup: songKeyboard(song.songbook.slug, backPage, song.id, showChords, hasChords, songUrl),
      });
    } catch (err) {
      if (isNotModifiedError(err)) return;
      logError('cb:chord', err, { userId: ctx.from?.id, songId: id });
      await ctx.reply(STR.err_song, { parse_mode: 'MarkdownV2' });
    }
  });

  // ── Global error handler ───────────────────────────────────────────────────
  bot.catch((err) => {
    logError('bot.catch', err.error, {
      updateId: err.ctx?.update?.update_id,
      userId: err.ctx?.from?.id,
    });
    err.ctx?.reply(STR.err_general, { parse_mode: 'MarkdownV2' }).catch(() => {});
  });

  return bot;
}
