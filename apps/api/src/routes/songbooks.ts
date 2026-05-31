import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { songs } from '@sdarm/db';
import type { Bindings } from '../types';
import { ErrorSchema, listOf, PaginationQuery, SongbookSchema, SongListItemSchema } from '../schemas';
import * as repo from '../repositories/songs';

const router = new OpenAPIHono<{ Bindings: Bindings }>();

const listSongbooksRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Songbooks'],
  responses: {
    200: {
      content: { 'application/json': { schema: z.array(SongbookSchema) } },
      description: 'All songbooks with song counts',
    },
  },
});

const getSongbookRoute = createRoute({
  method: 'get',
  path: '/{slug}',
  tags: ['Songbooks'],
  request: { params: z.object({ slug: z.string() }) },
  responses: {
    200: { content: { 'application/json': { schema: SongbookSchema } }, description: 'Songbook metadata' },
    404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
  },
});

const listSongsRoute = createRoute({
  method: 'get',
  path: '/{slug}/songs',
  tags: ['Songbooks'],
  request: {
    params: z.object({ slug: z.string() }),
    query: PaginationQuery.extend({
      q: z.string().max(100).optional().openapi({ description: 'Search by number, title, or lyrics (max 100 chars)' }),
    }),
  },
  responses: {
    200: { content: { 'application/json': { schema: listOf(SongListItemSchema) } }, description: 'Paginated song list' },
    404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Songbook not found' },
  },
});

router.openapi(listSongbooksRoute, async (c) => {
  const db = drizzle(c.env.DB);
  return c.json(await repo.listSongbooks(db), 200);
});

router.openapi(getSongbookRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const book = await repo.getSongbookBySlug(db, c.req.valid('param').slug);
  if (!book) return c.json({ error: 'Not found' }, 404);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(songs)
    .where(eq(songs.songbookId, book.id));
  return c.json({ ...book, songCount: count ?? 0 }, 200);
});

router.openapi(listSongsRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const book = await repo.getSongbookBySlug(db, c.req.valid('param').slug);
  if (!book) return c.json({ error: 'Not found' }, 404);
  const { q, limit, offset } = c.req.valid('query');
  return c.json(await repo.listSongs(db, book.id, { q, limit, offset }), 200);
});

export default router;
