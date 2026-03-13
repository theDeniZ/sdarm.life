import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../../types';
import {
  ErrorSchema,
  listOf,
  OkSchema,
  SongbookSchema,
  SongListItemSchema,
  SongPartSchema,
  SongPartTypeSchema,
  SongSchema,
  SongSheetSchema,
  SongSheetTypeSchema,
} from '../../schemas';
import * as repo from '../../repositories/songs';

const router = new OpenAPIHono<{ Bindings: Bindings }>();

// ── Songbooks ─────────────────────────────────────────────────────────────────

const SongbookBody = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  language: z.string().default('ru'),
  description: z.string().nullable().optional(),
  coverKey: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
});

router.openapi(
  createRoute({
    method: 'post',
    path: '/songbooks',
    tags: ['Admin / Songbooks'],
    security: [{ cfAccess: [] }],
    request: { body: { content: { 'application/json': { schema: SongbookBody } }, required: true } },
    responses: {
      201: { content: { 'application/json': { schema: SongbookSchema } }, description: 'Created' },
    },
  }),
  async (c) => {
    const db = drizzle(c.env.DB);
    const book = await repo.createSongbook(db, c.req.valid('json'));
    return c.json({ ...book, songCount: 0 }, 201);
  },
);

router.openapi(
  createRoute({
    method: 'patch',
    path: '/songbooks/{id}',
    tags: ['Admin / Songbooks'],
    security: [{ cfAccess: [] }],
    request: {
      params: z.object({ id: z.coerce.number() }),
      body: { content: { 'application/json': { schema: SongbookBody.partial() } }, required: true },
    },
    responses: {
      200: { content: { 'application/json': { schema: SongbookSchema } }, description: 'Updated' },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const db = drizzle(c.env.DB);
    const books = await repo.listSongbooks(db);
    const existing = books.find((b) => b.id === c.req.valid('param').id);
    if (!existing) return c.json({ error: 'Not found' }, 404);
    const book = await repo.updateSongbook(db, c.req.valid('param').id, c.req.valid('json'));
    if (!book) return c.json({ error: 'Not found' }, 404);
    return c.json({ ...book, songCount: existing.songCount }, 200);
  },
);

router.openapi(
  createRoute({
    method: 'delete',
    path: '/songbooks/{id}',
    tags: ['Admin / Songbooks'],
    security: [{ cfAccess: [] }],
    request: { params: z.object({ id: z.coerce.number() }) },
    responses: {
      200: { content: { 'application/json': { schema: OkSchema } }, description: 'Deleted' },
    },
  }),
  async (c) => {
    const db = drizzle(c.env.DB);
    await repo.deleteSongbook(db, c.req.valid('param').id);
    return c.json({ ok: true as const }, 200);
  },
);

// ── Songs ─────────────────────────────────────────────────────────────────────

const SongBody = z.object({
  songbookId: z.number(),
  number: z.number().int().positive(),
  title: z.string().min(1),
  author: z.string().nullable().optional(),
  copyright: z.string().nullable().optional(),
});

router.openapi(
  createRoute({
    method: 'get',
    path: '/songs/{id}',
    tags: ['Admin / Songbooks'],
    security: [{ cfAccess: [] }],
    request: { params: z.object({ id: z.coerce.number() }) },
    responses: {
      200: { content: { 'application/json': { schema: SongSchema } }, description: 'Song for editing' },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const db = drizzle(c.env.DB);
    const song = await repo.getSongById(db, c.req.valid('param').id);
    if (!song) return c.json({ error: 'Not found' }, 404);
    return c.json(song, 200);
  },
);

router.openapi(
  createRoute({
    method: 'post',
    path: '/songs',
    tags: ['Admin / Songbooks'],
    security: [{ cfAccess: [] }],
    request: { body: { content: { 'application/json': { schema: SongBody } }, required: true } },
    responses: {
      201: { content: { 'application/json': { schema: SongSchema } }, description: 'Created' },
    },
  }),
  async (c) => {
    const db = drizzle(c.env.DB);
    const song = await repo.createSong(db, c.req.valid('json'));
    return c.json((await repo.getSongById(db, song.id))!, 201);
  },
);

router.openapi(
  createRoute({
    method: 'patch',
    path: '/songs/{id}',
    tags: ['Admin / Songbooks'],
    security: [{ cfAccess: [] }],
    request: {
      params: z.object({ id: z.coerce.number() }),
      body: { content: { 'application/json': { schema: SongBody.omit({ songbookId: true }).partial() } }, required: true },
    },
    responses: {
      200: { content: { 'application/json': { schema: SongSchema } }, description: 'Updated' },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const db = drizzle(c.env.DB);
    const updated = await repo.updateSong(db, c.req.valid('param').id, c.req.valid('json'));
    if (!updated) return c.json({ error: 'Not found' }, 404);
    return c.json((await repo.getSongById(db, updated.id))!, 200);
  },
);

router.openapi(
  createRoute({
    method: 'delete',
    path: '/songs/{id}',
    tags: ['Admin / Songbooks'],
    security: [{ cfAccess: [] }],
    request: { params: z.object({ id: z.coerce.number() }) },
    responses: {
      200: { content: { 'application/json': { schema: OkSchema } }, description: 'Deleted' },
    },
  }),
  async (c) => {
    const db = drizzle(c.env.DB);
    await repo.deleteSong(db, c.req.valid('param').id);
    return c.json({ ok: true as const }, 200);
  },
);

// ── Song Parts ────────────────────────────────────────────────────────────────

const PartBody = z.object({
  type: SongPartTypeSchema,
  label: z.string().min(1),
  sortOrder: z.number().int(),
  lyrics: z.string(),
});

router.openapi(
  createRoute({
    method: 'post',
    path: '/songs/{id}/parts',
    tags: ['Admin / Songbooks'],
    security: [{ cfAccess: [] }],
    request: {
      params: z.object({ id: z.coerce.number() }),
      body: { content: { 'application/json': { schema: PartBody } }, required: true },
    },
    responses: {
      201: { content: { 'application/json': { schema: SongPartSchema } }, description: 'Part created' },
    },
  }),
  async (c) => {
    const db = drizzle(c.env.DB);
    const part = await repo.createSongPart(db, { songId: c.req.valid('param').id, ...c.req.valid('json') });
    return c.json(part, 201);
  },
);

router.openapi(
  createRoute({
    method: 'patch',
    path: '/songs/{id}/parts/{partId}',
    tags: ['Admin / Songbooks'],
    security: [{ cfAccess: [] }],
    request: {
      params: z.object({ id: z.coerce.number(), partId: z.coerce.number() }),
      body: { content: { 'application/json': { schema: PartBody.partial() } }, required: true },
    },
    responses: {
      200: { content: { 'application/json': { schema: SongPartSchema } }, description: 'Part updated' },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const db = drizzle(c.env.DB);
    const part = await repo.updateSongPart(db, c.req.valid('param').partId, c.req.valid('json'));
    if (!part) return c.json({ error: 'Not found' }, 404);
    return c.json(part, 200);
  },
);

router.openapi(
  createRoute({
    method: 'delete',
    path: '/songs/{id}/parts/{partId}',
    tags: ['Admin / Songbooks'],
    security: [{ cfAccess: [] }],
    request: { params: z.object({ id: z.coerce.number(), partId: z.coerce.number() }) },
    responses: {
      200: { content: { 'application/json': { schema: OkSchema } }, description: 'Part deleted' },
    },
  }),
  async (c) => {
    const db = drizzle(c.env.DB);
    await repo.deleteSongPart(db, c.req.valid('param').partId);
    return c.json({ ok: true as const }, 200);
  },
);

// ── Song Sheets ───────────────────────────────────────────────────────────────

const uploadSheetRoute = createRoute({
  method: 'post',
  path: '/songs/{id}/sheets/upload',
  tags: ['Admin / Songbooks'],
  security: [{ cfAccess: [] }],
  request: {
    params: z.object({ id: z.coerce.number() }),
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            file: z.any().openapi({ type: 'string', format: 'binary', description: 'PDF or image file' }),
            type: SongSheetTypeSchema.optional().openapi({ description: 'Override detected type' }),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    201: { content: { 'application/json': { schema: SongSheetSchema } }, description: 'Sheet uploaded' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Bad request' },
  },
});

// Multipart: use formData() directly — Zod body validation is skipped
router.openapi(uploadSheetRoute, async (c) => {
  const songId = c.req.valid('param').id;
  const form = await c.req.formData();
  const file = form.get('file') as File | null;
  if (!file) return c.json({ error: 'file is required' }, 400);

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const isPdf = ext === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
  if (!isPdf && !isImage) return c.json({ error: 'Only PDF and image files (jpg, png, webp, gif) are supported' }, 400);

  const type = (form.get('type') as 'pdf' | 'image' | null) ?? (isPdf ? 'pdf' : 'image');
  const key = `sheets/${songId}/${crypto.randomUUID()}.${ext}`;

  const db = drizzle(c.env.DB);
  await c.env.IMAGES.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'), cacheControl: 'public, max-age=31536000, immutable' },
  });

  const sheet = await repo.createSongSheet(db, { songId, key, type, sortOrder: 0 });
  return c.json(sheet, 201);
});

router.openapi(
  createRoute({
    method: 'delete',
    path: '/songs/{id}/sheets/{sheetId}',
    tags: ['Admin / Songbooks'],
    security: [{ cfAccess: [] }],
    request: { params: z.object({ id: z.coerce.number(), sheetId: z.coerce.number() }) },
    responses: {
      200: { content: { 'application/json': { schema: OkSchema } }, description: 'Sheet deleted' },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const db = drizzle(c.env.DB);
    const sheet = await repo.deleteSongSheet(db, c.req.valid('param').sheetId);
    if (!sheet) return c.json({ error: 'Not found' }, 404);
    await c.env.IMAGES.delete(sheet.key);
    return c.json({ ok: true as const }, 200);
  },
);

export default router;
