/**
 * Markdown endpoints for AI agents (ChatGPT, Claude, Gemini, Perplexity, …).
 *
 * Plain Hono router, deliberately outside the OpenAPI spec — like `routes/og.ts`,
 * these return `text/markdown` rather than a JSON contract, and `@hono/zod-openapi`
 * has nothing to validate here. Handlers call repositories/services only, the
 * same rule as every other route file; Markdown formatting itself lives in the
 * pure, unit-tested `services/llm/markdown.ts`.
 *
 * Caching is per-route, mirroring `routes/bible.ts`: bible book/list content is
 * immutable text and cached at the edge for a day, keyed by the Bible cache
 * generation so a takedown or license edit strands it immediately. The bible
 * translation *index* is left uncached, like `/bible/translations`, because it
 * reflects the admin allowlist and the `allowDownload` gate and should change
 * without a day's lag. Everything else here is cheap D1 reads and is cached for
 * an hour.
 */
import { Hono, type Context } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../types';
import { cached } from '../middleware/cache';
import { getCacheGeneration } from '../services/bible/cache';
import * as catalog from '../services/bible/catalog';
import * as local from '../services/bible/local';
import * as postsRepo from '../repositories/posts';
import * as songsRepo from '../repositories/songs';
import * as treasuresRepo from '../repositories/treasures';
import de from '@sdarm/i18n/messages/de';
import en from '@sdarm/i18n/messages/en';
import {
  buildBibleBookMarkdown,
  buildBibleBooksMarkdown,
  buildBibleIndexMarkdown,
  buildIndexMarkdown,
  buildPostMarkdown,
  buildPostsIndexMarkdown,
  buildSiteMarkdown,
  buildSongbookMarkdown,
  buildSongbooksIndexMarkdown,
  buildSongMarkdown,
  buildTreasuresMarkdown,
  forbiddenMarkdown,
  notFoundMarkdown,
  type GlaubensArticleInput,
} from '../services/llm/markdown';

const router = new Hono<{ Bindings: Bindings }>();

const ONE_HOUR = 3600;
const ONE_DAY = 86400;
const textCache = cached(ONE_DAY, { version: (c) => getCacheGeneration(c.env) });

type LlmContext = Context<{ Bindings: Bindings }>;

function respond(c: LlmContext, r: { body: string; status: number; headers: Record<string, string> }) {
  return c.body(r.body, r.status as 200 | 403 | 404, r.headers);
}

function apiOrigin(c: LlmContext): string {
  return new URL(c.req.url).origin;
}

router.get('/', cached(ONE_DAY), (c) => respond(c, buildIndexMarkdown(apiOrigin(c))));

// ── Site ──────────────────────────────────────────────────────────────────────

router.get('/site', cached(ONE_HOUR), async (c) => {
  const lang: 'de' | 'en' = c.req.query('lang') === 'en' ? 'en' : 'de';
  const messages = lang === 'en' ? en : de;
  const about = messages.web.about;
  const config = await c.env.KV.get<Record<string, string | null>>('config', 'json');

  const articles = about.glaubens.articles as GlaubensArticleInput[];

  return respond(
    c,
    buildSiteMarkdown({
      lang,
      aboutText1: config?.about_text_1 ?? about.fallbackText1,
      aboutText2: config?.about_text_2 ?? about.fallbackText2,
      articles,
      email: 'info@sdarm.life',
      facebook: config?.facebook_url ?? null,
      whatsapp: config?.whatsapp_url ?? null,
      instagram: config?.instagram_url ?? null,
      youtube: config?.youtube_url ?? null,
    }),
  );
});

// ── Posts ─────────────────────────────────────────────────────────────────────

router.get('/posts', cached(ONE_HOUR), async (c) => {
  const db = drizzle(c.env.DB);
  const { items } = await postsRepo.listPosts(db, { limit: 50 });
  return respond(
    c,
    buildPostsIndexMarkdown(
      items.map((p) => ({
        title: p.title,
        slug: p.slug,
        publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
        author: p.author,
        excerpt: p.excerpt,
      })),
      apiOrigin(c),
    ),
  );
});

router.get('/posts/:slug', cached(ONE_HOUR), async (c) => {
  const db = drizzle(c.env.DB);
  const post = await postsRepo.getPostBySlug(db, c.req.param('slug'));
  if (!post || post.deletedAt) return respond(c, notFoundMarkdown());
  return respond(
    c,
    buildPostMarkdown({
      title: post.title,
      slug: post.slug,
      publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
      author: post.author,
      excerpt: post.excerpt,
      body: post.body,
    }),
  );
});

// ── Songbooks ─────────────────────────────────────────────────────────────────

router.get('/songbooks', cached(ONE_HOUR), async (c) => {
  const db = drizzle(c.env.DB);
  const books = await songsRepo.listSongbooks(db);
  return respond(c, buildSongbooksIndexMarkdown(books, apiOrigin(c)));
});

router.get('/songbooks/:slug', cached(ONE_HOUR), async (c) => {
  const db = drizzle(c.env.DB);
  const book = await songsRepo.getSongbookBySlug(db, c.req.param('slug'));
  if (!book) return respond(c, notFoundMarkdown());
  const songs = await songsRepo.listSongsFull(db, book.id);
  return respond(
    c,
    buildSongbookMarkdown({
      slug: book.slug,
      title: book.title,
      language: book.language,
      description: book.description,
      songs,
    }),
  );
});

router.get('/songs/:id', cached(ONE_HOUR), async (c) => {
  const db = drizzle(c.env.DB);
  const id = Number(c.req.param('id'));
  if (!Number.isFinite(id)) return respond(c, notFoundMarkdown());
  const song = await songsRepo.getSongById(db, id);
  if (!song) return respond(c, notFoundMarkdown());
  return respond(
    c,
    buildSongMarkdown(
      { id: song.id, number: song.number, title: song.title, author: song.author, copyright: song.copyright, parts: song.parts },
      song.songbook.slug,
      song.songbook.title,
    ),
  );
});

// ── Treasures ─────────────────────────────────────────────────────────────────

router.get('/treasures', cached(ONE_HOUR), async (c) => {
  const db = drizzle(c.env.DB);
  const { items } = await treasuresRepo.listTreasures(db, { limit: 500 });
  return respond(c, buildTreasuresMarkdown(items));
});

// ── Bible ─────────────────────────────────────────────────────────────────────

// Uncached, like `GET /bible/translations` — this list reflects the admin
// allowlist and the `allowDownload` gate and must not lag a day behind either.
router.get('/bible', async (c) => {
  const all = await catalog.listTranslations(c.env);
  const items = all.filter((t) => t.source === 'local' && t.license.allowDownload);
  return respond(
    c,
    buildBibleIndexMarkdown(
      items.map((t) => ({
        code: t.code,
        name: t.name,
        abbreviation: t.abbreviation,
        language: t.language,
        year: t.year,
        licenseBasis: t.license.basis,
        notice: t.license.notice ?? t.license.provenance,
      })),
      apiOrigin(c),
    ),
  );
});

router.get('/bible/:code', textCache, async (c) => {
  const code = c.req.param('code');
  const t = await catalog.resolveTranslation(c.env, code);
  if (!t || t.source !== 'local') return respond(c, notFoundMarkdown());
  if (!t.license.allowDownload) return respond(c, forbiddenMarkdown('This translation is not enabled for download.'));

  const books = await catalog.listBooks(c.env, t);
  if (books.length === 0) return respond(c, notFoundMarkdown());
  return respond(
    c,
    buildBibleBooksMarkdown(
      t.name,
      t.license.notice ?? t.license.provenance,
      books.map((b) => ({ code: b.code, name: b.name, testament: b.testament, chapterCount: b.chapterCount })),
      apiOrigin(c),
      t.code,
    ),
  );
});

router.get('/bible/:code/:book', textCache, async (c) => {
  const code = c.req.param('code');
  const t = await catalog.resolveTranslation(c.env, code);
  if (!t || t.source !== 'local') return respond(c, notFoundMarkdown());
  if (!t.license.allowDownload) return respond(c, forbiddenMarkdown('This translation is not enabled for download.'));

  const books = await catalog.listBooks(c.env, t);
  const book = books.find((b) => b.code === c.req.param('book').toUpperCase());
  if (!book) return respond(c, notFoundMarkdown());

  const verses = await local.getBookVerses(c.env, t.id, book.code);
  if (!verses) return respond(c, notFoundMarkdown());

  const cap = t.license.maxVersesPerRequest;
  const truncated = cap !== null && cap > 0 && verses.length > cap;
  const finalVerses = truncated ? verses.slice(0, cap) : verses;

  return respond(
    c,
    buildBibleBookMarkdown({
      translationName: t.name,
      notice: t.license.notice ?? t.license.provenance,
      bookName: book.name,
      verses: finalVerses,
      truncated,
      maxVerses: cap,
    }),
  );
});

export default router;
