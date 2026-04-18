import { Bot, InlineKeyboard } from 'grammy';
import type { Context } from 'grammy';
import type { SongbookDto } from '@sdarm/types';
import type { Env } from './types';
import { createApiClient, type ApiClient } from './api';
import { isRateLimited, DEFAULT_RATE_LIMIT_PER_MINUTE } from './rate-limit';
import { getSession, saveSession } from './session';
import { getT, DEFAULT_LANG, detectLangFromCode, type Lang, type Strings } from './i18n';
import { logError } from './logger';
import { formatSong, formatSongList, formatSearchResults, formatSongbookList, esc } from './format';

// ── Constants ─────────────────────────────────────────────────────────────────

const SONGS_PER_PAGE = 15;
const MAX_SEARCH_RESULTS = 20;
const CONTACT_URL = 'https://t.me/maestr_os';

// Callback parameter bounds — accept only sane values to avoid pathological input
const MAX_SONG_ID = 10_000_000;
const MAX_PAGE = 1000;
const SLUG_RE = /^[a-zA-Z0-9-]{1,100}$/;
const NUMERIC_RE = /^\d{1,6}$/;

// ── Session helpers ───────────────────────────────────────────────────────────

/**
 * Resolve the user's interface language.
 * Order of precedence:
 *   1. Saved session.lang
 *   2. Telegram User.language_code (auto-detected on first interaction; persisted)
 *   3. DEFAULT_LANG (Russian)
 */
async function ensureUserLang(kv: KVNamespace, ctx: Context): Promise<Lang> {
  const userId = ctx.from?.id;
  if (!userId) return DEFAULT_LANG;
  try {
    const session = await getSession(kv, userId);
    if (session.lang) return session.lang;
    const detected = detectLangFromCode(ctx.from?.language_code);
    if (detected) {
      // Best-effort persist so subsequent requests skip detection
      saveSession(kv, userId, { lang: detected }).catch(() => {});
      return detected;
    }
    return DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

// ── Keyboard builders ─────────────────────────────────────────────────────────

function mainMenuKeyboard(t: Strings, resume?: { title: string }): InlineKeyboard {
  const kb = new InlineKeyboard();

  if (resume) {
    const label = resume.title.length > 28 ? resume.title.slice(0, 28) + '…' : resume.title;
    kb.text(t.btn_resume(label), 'resume').row();
  }

  kb.text(t.btn_songbooks, 'sb_list').row();
  kb.text(t.btn_search, 'search_hint').row();
  kb.text(t.btn_lang, 'lang_choose').row();
  kb.url(t.btn_contact, CONTACT_URL);
  return kb;
}

function songbooksKeyboard(t: Strings, books: SongbookDto[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const b of books) {
    kb.text(`📖 ${b.title} (${b.songCount})`, `sb:${b.slug}:0`).row();
  }
  kb.text(t.btn_back_menu, 'main_menu');
  return kb;
}

function songsKeyboard(
  t: Strings,
  items: { id: number; number: number; title: string }[],
  slug: string,
  page: number,
  total: number,
): InlineKeyboard {
  const kb = new InlineKeyboard();
  const pages = Math.ceil(total / SONGS_PER_PAGE);

  for (const s of items) {
    kb.text(`№${s.number} ${s.title}`, `song:${s.id}:${page}`).row();
  }

  kb.row();
  if (page > 0) kb.text('◀️', `sb:${slug}:${page - 1}`);
  kb.text(`${page + 1}/${pages}`, 'noop');
  if ((page + 1) * SONGS_PER_PAGE < total) kb.text('▶️', `sb:${slug}:${page + 1}`);

  kb.row().text(t.btn_switch, 'sb_list').row().text(t.btn_home, 'main_menu');
  return kb;
}

/**
 * Keyboard shown below a song.
 * @param songId      ID of the current song (for chord toggle callback).
 * @param showChords  Whether chords are currently visible.
 * @param hasChords   Whether the song actually has chord annotations at all.
 */
function songKeyboard(
  t: Strings,
  songbookSlug: string,
  page: number,
  songId: number,
  showChords: boolean,
  hasChords: boolean,
): InlineKeyboard {
  const kb = new InlineKeyboard();

  // Chord toggle — only shown when the song has chord annotations
  if (hasChords) {
    const next = showChords ? 0 : 1;
    kb.text(showChords ? t.btn_hide_chords : t.btn_show_chords, `chord:${songId}:${page}:${next}`).row();
  }

  kb.text(t.btn_back_list, `sb:${songbookSlug}:${page}`).row();
  kb.text(t.btn_switch_short, 'sb_list').row();
  kb.url(t.btn_contact_short, CONTACT_URL);
  return kb;
}

function searchResultsKeyboard(
  t: Strings,
  items: { id: number; number: number; title: string; songbook: { slug: string } }[],
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const s of items) {
    kb.text(`№${s.number} ${s.title}`, `song:${s.id}:0`).row();
  }
  kb.text(t.btn_back_menu, 'main_menu');
  return kb;
}

function langKeyboard(t: Strings, current?: Lang): InlineKeyboard {
  const mark = (lang: Lang, label: string) => (current === lang ? `${label}  ✓` : label);
  return new InlineKeyboard()
    .text(mark('ru', t.btn_lang_ru), 'lang:ru')
    .row()
    .text(mark('en', t.btn_lang_en), 'lang:en')
    .row()
    .text(mark('de', t.btn_lang_de), 'lang:de');
}

// ── Screen renderers ──────────────────────────────────────────────────────────

async function showMainMenu(ctx: Context, kv: KVNamespace): Promise<void> {
  const userId = ctx.from?.id;
  const session = userId ? await getSession(kv, userId) : {};
  const lang = session.lang ?? (await ensureUserLang(kv, ctx));
  const t = getT(lang);

  const resume = session.sbSlug && session.sbTitle ? { title: session.sbTitle } : undefined;

  await editOrReply(ctx, t.welcome, {
    parse_mode: 'MarkdownV2',
    reply_markup: mainMenuKeyboard(t, resume),
  });
}

async function showSongbooks(ctx: Context, api: ApiClient, t: Strings): Promise<void> {
  const books = await api.getSongbooks();
  await editOrReply(ctx, formatSongbookList(books, t), {
    parse_mode: 'MarkdownV2',
    reply_markup: songbooksKeyboard(t, books),
  });
}

async function showSongs(
  ctx: Context,
  api: ApiClient,
  kv: KVNamespace,
  slug: string,
  page: number,
  t: Strings,
): Promise<void> {
  const offset = page * SONGS_PER_PAGE;
  const [songbook, { items, total }] = await Promise.all([
    api.getSongbook(slug),
    api.getSongs(slug, { limit: SONGS_PER_PAGE, offset }),
  ]);

  if (items.length === 0) {
    await editOrReply(ctx, t.no_songs, { parse_mode: 'MarkdownV2' });
    return;
  }

  const userId = ctx.from?.id;
  if (userId) {
    saveSession(kv, userId, { sbSlug: slug, sbTitle: songbook.title, sbPage: page }).catch(() => {});
  }

  await editOrReply(ctx, formatSongList(items, songbook, page, total, SONGS_PER_PAGE, t), {
    parse_mode: 'MarkdownV2',
    reply_markup: songsKeyboard(t, items, slug, page, total),
  });
}

/**
 * Open a song as a new message (from song list taps).
 * Short songs (≤ 4096 chars) get a chord toggle button.
 * Long songs are split into chunks; toggle is unavailable (multi-message
 * editing is impractical) and the user is told why.
 */
async function showSong(
  ctx: Context,
  api: ApiClient,
  id: number,
  backPage: number,
  t: Strings,
  showChords = false,
): Promise<void> {
  const song = await api.getSong(id);
  const text = formatSong(song, t, showChords);
  const songHasChords = song.parts.some((p) => /\[[A-G][^\]]{0,10}\]/.test(p.lyrics));

  if (text.length <= 4096) {
    await ctx.reply(text, {
      parse_mode: 'MarkdownV2',
      reply_markup: songKeyboard(t, song.songbook.slug, backPage, song.id, showChords, songHasChords),
    });
    return;
  }

  // Long song: split, no chord toggle, explain why on the last chunk.
  // Use a tighter limit so the hint fits inside the final chunk.
  const HINT_RESERVE = 200;
  const chunks = splitMessage(text, songHasChords ? 4096 - HINT_RESERVE : 4096);
  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    let body = chunks[i];
    if (isLast && songHasChords) body += '\n\n' + t.long_song_no_chords;
    await ctx.reply(body, {
      parse_mode: 'MarkdownV2',
      ...(isLast ? { reply_markup: songKeyboard(t, song.songbook.slug, backPage, song.id, showChords, false) } : {}),
    });
  }
}

async function showSearch(ctx: Context, api: ApiClient, query: string, t: Strings): Promise<void> {
  const trimmed = query.trim().slice(0, 100);
  if (!trimmed) {
    await editOrReply(ctx, t.search_prompt, { parse_mode: 'MarkdownV2' });
    return;
  }

  const { items, total } = await api.searchSongs(trimmed, { limit: MAX_SEARCH_RESULTS });
  const text = formatSearchResults(items, trimmed, total, t);
  const kb =
    items.length > 0 ? searchResultsKeyboard(t, items) : new InlineKeyboard().text(t.btn_back_menu, 'main_menu');

  await editOrReply(ctx, text, { parse_mode: 'MarkdownV2', reply_markup: kb });
}

/**
 * Context-aware numeric search.
 * If the user is currently browsing a songbook and types a pure number,
 * try matching by song number inside that book first. Falls back to global
 * search when the book has no such number.
 */
async function showNumericSearchInBook(
  ctx: Context,
  api: ApiClient,
  slug: string,
  bookTitle: string,
  number: string,
  t: Strings,
): Promise<boolean> {
  const { items, total } = await api.getSongs(slug, { q: number, limit: SONGS_PER_PAGE });
  if (items.length === 0) return false;

  // Render as a search-results screen scoped to this songbook + offer global fallback
  const lines = [
    t.search_in_book_header(esc(number), esc(bookTitle)),
    ...items.map((s) => `*№${s.number}* ${esc(s.title)}`),
  ];
  if (total > items.length) {
    lines.unshift(t.search_truncated(items.length, total).trimEnd());
  }
  const kb = new InlineKeyboard();
  for (const s of items) kb.text(`№${s.number} ${s.title}`, `song:${s.id}:0`).row();
  kb.text(t.btn_search_global, `gs:${number}`).row();
  kb.text(t.btn_back_menu, 'main_menu');

  await ctx.reply(lines.join('\n'), { parse_mode: 'MarkdownV2', reply_markup: kb });
  return true;
}

// ── Utility ───────────────────────────────────────────────────────────────────

function splitMessage(text: string, limit: number): string[] {
  const chunks: string[] = [];
  let current = '';
  for (const line of text.split('\n')) {
    if ((current + '\n' + line).length > limit) {
      if (current) chunks.push(current);
      current = line;
    } else {
      current = current ? current + '\n' + line : line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function editOrReply(
  ctx: Context,
  text: string,
  extra: { parse_mode?: 'MarkdownV2'; reply_markup?: InlineKeyboard },
): Promise<void> {
  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, extra);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('not modified')) throw err;
    }
  } else {
    await ctx.reply(text, extra);
  }
}

function parseBoundedInt(raw: string, max: number): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0 || n > max) return null;
  return n;
}

// ── Bot factory ───────────────────────────────────────────────────────────────

export function createBot(env: Env): Bot {
  const bot = new Bot(env.BOT_TOKEN);
  const api = createApiClient(env.API_URL ?? 'https://api.sdarm.life/api/v1');
  const kv = env.RATE_KV;
  const rateLimit = parseBoundedInt(env.RATE_LIMIT_PER_MIN ?? '', 10_000) ?? DEFAULT_RATE_LIMIT_PER_MINUTE;

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
        const t = getT(await ensureUserLang(kv, ctx));
        await ctx.reply(t.rate_limit, { parse_mode: 'MarkdownV2' });
        return;
      }
    } catch (err) {
      logError('rate-limit-middleware', err);
    }
    return next();
  });

  // ── Commands ───────────────────────────────────────────────────────────────

  bot.command('start', async (ctx) => {
    // Remove any persistent Reply keyboard left over from older bot versions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await ctx.reply('🎵', { reply_markup: { remove_keyboard: true } as any }).catch(() => {});
    await showMainMenu(ctx, kv);
  });

  bot.command('help', async (ctx) => {
    const t = getT(await ensureUserLang(kv, ctx));
    await ctx.reply(t.help, { parse_mode: 'MarkdownV2' });
  });

  bot.command('lang', async (ctx) => {
    const lang = await ensureUserLang(kv, ctx);
    const t = getT(lang);
    await ctx.reply(t.lang_choose, { parse_mode: 'MarkdownV2', reply_markup: langKeyboard(t, lang) });
  });

  bot.command('songbooks', async (ctx) => {
    const t = getT(await ensureUserLang(kv, ctx));
    try {
      await showSongbooks(ctx, api, t);
    } catch (err) {
      logError('cmd:songbooks', err, { userId: ctx.from?.id });
      await ctx.reply(t.err_books, { parse_mode: 'MarkdownV2' });
    }
  });

  bot.command('search', async (ctx) => {
    const t = getT(await ensureUserLang(kv, ctx));
    const query = ctx.match?.trim() ?? '';
    if (!query) {
      await ctx.reply(t.search_prompt, { parse_mode: 'MarkdownV2' });
      return;
    }
    try {
      await showSearch(ctx, api, query, t);
    } catch (err) {
      logError('cmd:search', err, { userId: ctx.from?.id, query });
      await ctx.reply(t.err_search, { parse_mode: 'MarkdownV2' });
    }
  });

  // ── Plain text → context-aware search ────────────────────────────────────
  bot.on('message:text', async (ctx) => {
    if (ctx.chat?.type !== 'private') return;
    const text = ctx.message.text.trim();
    if (text.startsWith('/')) return;

    const t = getT(await ensureUserLang(kv, ctx));

    if (text.length < 2) {
      await ctx.reply(t.min_chars, { parse_mode: 'MarkdownV2' });
      return;
    }

    try {
      // If the user is browsing a songbook AND typed a pure number,
      // search within that songbook first; fall back to global search if empty.
      const userId = ctx.from?.id;
      if (userId && NUMERIC_RE.test(text)) {
        const session = await getSession(kv, userId);
        if (session.sbSlug && session.sbTitle) {
          const handled = await showNumericSearchInBook(ctx, api, session.sbSlug, session.sbTitle, text, t);
          if (handled) return;
        }
      }
      await showSearch(ctx, api, text, t);
    } catch (err) {
      logError('text:search', err, { userId: ctx.from?.id, text });
      await ctx.reply(t.err_search, { parse_mode: 'MarkdownV2' });
    }
  });

  // ── Callback queries ───────────────────────────────────────────────────────

  bot.callbackQuery('main_menu', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showMainMenu(ctx, kv);
  });

  bot.callbackQuery('sb_list', async (ctx) => {
    await ctx.answerCallbackQuery();
    const t = getT(await ensureUserLang(kv, ctx));
    try {
      await showSongbooks(ctx, api, t);
    } catch (err) {
      logError('cb:sb_list', err, { userId: ctx.from?.id });
      await ctx.reply(t.err_books, { parse_mode: 'MarkdownV2' });
    }
  });

  bot.callbackQuery('resume', async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    try {
      const session = await getSession(kv, userId);
      const t = getT(session.lang ?? (await ensureUserLang(kv, ctx)));
      if (session.sbSlug && SLUG_RE.test(session.sbSlug)) {
        const page = Math.min(Math.max(session.sbPage ?? 0, 0), MAX_PAGE);
        await showSongs(ctx, api, kv, session.sbSlug, page, t);
      } else {
        await showMainMenu(ctx, kv);
      }
    } catch (err) {
      logError('cb:resume', err, { userId });
      await showMainMenu(ctx, kv);
    }
  });

  bot.callbackQuery('lang_choose', async (ctx) => {
    await ctx.answerCallbackQuery();
    const lang = await ensureUserLang(kv, ctx);
    const t = getT(lang);
    await editOrReply(ctx, t.lang_choose, {
      parse_mode: 'MarkdownV2',
      reply_markup: langKeyboard(t, lang),
    });
  });

  // lang:ru / lang:en / lang:de
  bot.callbackQuery(/^lang:(ru|en|de)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const lang = ctx.match[1] as Lang;
    const userId = ctx.from?.id;
    if (userId) await saveSession(kv, userId, { lang });
    const t = getT(lang);
    const name = lang === 'ru' ? 'Русский 🇷🇺' : lang === 'de' ? 'Deutsch 🇩🇪' : 'English 🇬🇧';
    // Edit the language-selection message in place with a confirmation + back button
    await editOrReply(ctx, t.lang_set(name), {
      parse_mode: 'MarkdownV2',
      reply_markup: new InlineKeyboard().text(t.btn_back_menu, 'main_menu'),
    });
  });

  bot.callbackQuery('search_hint', async (ctx) => {
    await ctx.answerCallbackQuery();
    const t = getT(await ensureUserLang(kv, ctx));
    await editOrReply(ctx, t.search_hint, {
      parse_mode: 'MarkdownV2',
      reply_markup: new InlineKeyboard().text(t.btn_back_menu, 'main_menu'),
    });
  });

  bot.callbackQuery('noop', async (ctx) => {
    await ctx.answerCallbackQuery();
  });

  // gs:{query} — explicit "search globally" button from in-book numeric results
  bot.callbackQuery(/^gs:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const query = ctx.match[1].slice(0, 100);
    const t = getT(await ensureUserLang(kv, ctx));
    try {
      await showSearch(ctx, api, query, t);
    } catch (err) {
      logError('cb:gs', err, { userId: ctx.from?.id, query });
      await ctx.reply(t.err_search, { parse_mode: 'MarkdownV2' });
    }
  });

  // sb:{slug}:{page}
  bot.callbackQuery(/^sb:([^:]+):(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const slug = ctx.match[1];
    const page = parseBoundedInt(ctx.match[2], MAX_PAGE);
    if (!SLUG_RE.test(slug) || page === null) return;
    const t = getT(await ensureUserLang(kv, ctx));
    try {
      await showSongs(ctx, api, kv, slug, page, t);
    } catch (err) {
      logError('cb:sb', err, { userId: ctx.from?.id, slug, page });
      await ctx.reply(t.err_songs, { parse_mode: 'MarkdownV2' });
    }
  });

  // song:{id}:{page}  — opens song as a NEW message
  bot.callbackQuery(/^song:(\d+):(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const id = parseBoundedInt(ctx.match[1], MAX_SONG_ID);
    const backPage = parseBoundedInt(ctx.match[2], MAX_PAGE);
    if (id === null || id < 1 || backPage === null) return;
    const t = getT(await ensureUserLang(kv, ctx));
    try {
      await showSong(ctx, api, id, backPage, t, false);
    } catch (err) {
      logError('cb:song', err, { userId: ctx.from?.id, songId: id });
      await ctx.reply(t.err_song, { parse_mode: 'MarkdownV2' });
    }
  });

  // chord:{id}:{page}:{0|1}  — toggle chords by EDITING the current song message
  bot.callbackQuery(/^chord:(\d+):(\d+):(0|1)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const id = parseBoundedInt(ctx.match[1], MAX_SONG_ID);
    const backPage = parseBoundedInt(ctx.match[2], MAX_PAGE);
    if (id === null || id < 1 || backPage === null) return;
    const showChords = ctx.match[3] === '1';
    const t = getT(await ensureUserLang(kv, ctx));
    try {
      const song = await api.getSong(id);
      const text = formatSong(song, t, showChords);
      const songHasChords = song.parts.some((p) => /\[[A-G][^\]]{0,10}\]/.test(p.lyrics));
      await ctx.editMessageText(text, {
        parse_mode: 'MarkdownV2',
        reply_markup: songKeyboard(t, song.songbook.slug, backPage, song.id, showChords, songHasChords),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('not modified')) {
        logError('cb:chord', err, { userId: ctx.from?.id, songId: id });
        await ctx.reply(t.err_song, { parse_mode: 'MarkdownV2' });
      }
    }
  });

  // ── Global error handler ───────────────────────────────────────────────────
  bot.catch((err) => {
    logError('bot.catch', err.error, {
      updateId: err.ctx?.update?.update_id,
      userId: err.ctx?.from?.id,
    });
    err.ctx
      ?.reply('⚠️ Something went wrong\\. Please try again\\.', { parse_mode: 'MarkdownV2' })
      .catch(() => {});
  });

  return bot;
}
