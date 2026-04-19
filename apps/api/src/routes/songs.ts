import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../types';
import { ErrorSchema, listOf, PaginationQuery, SongRecentSchema, SongSchema, SongSearchResultSchema } from '../schemas';
import * as repo from '../repositories/songs';

// ── Search router ─────────────────────────────────────────────────────────────
// Mounted at /songs/search in index.ts — a literal path that cannot be shadowed
// by the /{id} parameter route.

export const songSearchRouter = new OpenAPIHono<{ Bindings: Bindings }>();

const searchSongsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Songbooks'],
  request: {
    query: PaginationQuery.extend({
      q: z.string().min(1).max(100).openapi({ description: 'Search by number, title, or lyrics (max 100 chars)' }),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: listOf(SongSearchResultSchema) } },
      description: 'Matching songs across all songbooks',
    },
  },
});

songSearchRouter.openapi(searchSongsRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const { q, limit, offset } = c.req.valid('query');
  return c.json(await repo.searchSongsGlobal(db, { q, limit, offset }), 200);
});

// ── Recent songs router ───────────────────────────────────────────────────────
// Mounted at /songs/recent in index.ts — literal path, must come before /songs/{id}.
// Used by the bot's notification cron.

export const songRecentRouter = new OpenAPIHono<{ Bindings: Bindings }>();

const listRecentSongsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Songbooks'],
  request: {
    query: z.object({
      limit: z.coerce.number().min(1).max(100).optional().openapi({ example: 20 }),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.array(SongRecentSchema) } },
      description: 'Recently added songs across all songbooks (most recent first).',
    },
  },
});

songRecentRouter.openapi(listRecentSongsRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const { limit } = c.req.valid('query');
  return c.json(await repo.listRecentSongs(db, { limit }), 200);
});

// ── Single song router ────────────────────────────────────────────────────────
// Mounted at /songs in index.ts.

const router = new OpenAPIHono<{ Bindings: Bindings }>();

const getSongRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Songbooks'],
  request: { params: z.object({ id: z.coerce.number() }) },
  responses: {
    200: { content: { 'application/json': { schema: SongSchema } }, description: 'Full song with parts and sheets' },
    404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
  },
});

router.openapi(getSongRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const song = await repo.getSongById(db, c.req.valid('param').id);
  if (!song) return c.json({ error: 'Not found' }, 404);
  return c.json(song, 200);
});

export default router;
