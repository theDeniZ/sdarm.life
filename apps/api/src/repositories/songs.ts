import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { songbooks, songParts, songSheets, songs } from '@sdarm/db';

// ── Songbooks ─────────────────────────────────────────────────────────────────

export async function listSongbooks(db: DrizzleD1Database) {
  const [books, counts] = await Promise.all([
    db
      .select({
        id: songbooks.id,
        title: songbooks.title,
        slug: songbooks.slug,
        language: songbooks.language,
        description: songbooks.description,
        coverKey: songbooks.coverKey,
        sortOrder: songbooks.sortOrder,
      })
      .from(songbooks)
      .orderBy(asc(songbooks.sortOrder), asc(songbooks.title)),
    db.select({ songbookId: songs.songbookId, count: sql<number>`count(*)` }).from(songs).groupBy(songs.songbookId),
  ]);

  const countMap = Object.fromEntries(counts.map((c) => [c.songbookId, c.count]));
  return books.map((b) => ({ ...b, songCount: countMap[b.id] ?? 0 }));
}

export async function getSongbookBySlug(db: DrizzleD1Database, slug: string) {
  const [book] = await db.select().from(songbooks).where(eq(songbooks.slug, slug)).limit(1);
  return book ?? null;
}

export async function getSongbookById(db: DrizzleD1Database, id: number) {
  const [book] = await db.select().from(songbooks).where(eq(songbooks.id, id)).limit(1);
  return book ?? null;
}

export async function createSongbook(
  db: DrizzleD1Database,
  data: { title: string; slug: string; language: string; description?: string | null; coverKey?: string | null; sortOrder?: number },
) {
  const [book] = await db.insert(songbooks).values(data).returning();
  return book;
}

export async function updateSongbook(
  db: DrizzleD1Database,
  id: number,
  data: Partial<{ title: string; slug: string; language: string; description: string | null; coverKey: string | null; sortOrder: number }>,
) {
  const [book] = await db
    .update(songbooks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(songbooks.id, id))
    .returning();
  return book ?? null;
}

export async function deleteSongbook(db: DrizzleD1Database, id: number) {
  const songIdSubquery = sql`(SELECT id FROM songs WHERE songbook_id = ${id})`;

  const sheets = await db.select({ key: songSheets.key }).from(songSheets).where(sql`${songSheets.songId} IN ${songIdSubquery}`);
  const sheetKeys = sheets.map((s) => s.key);

  await db.delete(songSheets).where(sql`${songSheets.songId} IN ${songIdSubquery}`);
  await db.delete(songParts).where(sql`${songParts.songId} IN ${songIdSubquery}`);
  await db.delete(songs).where(eq(songs.songbookId, id));
  await db.delete(songbooks).where(eq(songbooks.id, id));
  return sheetKeys;
}

// ── Songs ─────────────────────────────────────────────────────────────────────

export async function listSongs(
  db: DrizzleD1Database,
  songbookId: number,
  opts: { q?: string; limit?: number; offset?: number },
) {
  const { q, limit = 50, offset = 0 } = opts;
  const filter = q
    ? and(
        eq(songs.songbookId, songbookId),
        or(like(songs.title, `%${q}%`), like(sql`cast(${songs.number} as text)`, `%${q}%`)),
      )
    : eq(songs.songbookId, songbookId);

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({ id: songs.id, number: songs.number, title: songs.title, author: songs.author, copyright: songs.copyright })
      .from(songs)
      .where(filter)
      .orderBy(asc(songs.number))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(songs).where(filter),
  ]);

  return { items: rows, total: count };
}

export async function getSongById(db: DrizzleD1Database, id: number) {
  const [row] = await db
    .select({
      id: songs.id,
      number: songs.number,
      title: songs.title,
      author: songs.author,
      copyright: songs.copyright,
      createdAt: songs.createdAt,
      updatedAt: songs.updatedAt,
      songbookId: songbooks.id,
      songbookTitle: songbooks.title,
      songbookSlug: songbooks.slug,
    })
    .from(songs)
    .innerJoin(songbooks, eq(songs.songbookId, songbooks.id))
    .where(eq(songs.id, id))
    .limit(1);

  if (!row) return null;

  const [parts, sheets] = await Promise.all([
    db.select().from(songParts).where(eq(songParts.songId, id)).orderBy(asc(songParts.sortOrder)),
    db.select().from(songSheets).where(eq(songSheets.songId, id)).orderBy(asc(songSheets.sortOrder)),
  ]);

  const { songbookId, songbookTitle, songbookSlug, ...songData } = row;
  return {
    ...songData,
    songbook: { id: songbookId, title: songbookTitle, slug: songbookSlug },
    parts: parts.map(({ songId: _s, ...p }) => p),
    sheets: sheets.map(({ songId: _s, uploadedAt: _u, ...sh }) => sh),
  };
}

/**
 * Most recently created songs across all songbooks.
 * Used by the bot's notification cron to discover newly added songs.
 * Ordered by `created_at DESC, id DESC` so a tied second resolves deterministically.
 */
export async function listRecentSongs(db: DrizzleD1Database, opts: { limit?: number } = {}) {
  const { limit = 20 } = opts;
  const rows = await db
    .select({
      id: songs.id,
      number: songs.number,
      title: songs.title,
      author: songs.author,
      createdAt: songs.createdAt,
      sbId: songbooks.id,
      sbTitle: songbooks.title,
      sbSlug: songbooks.slug,
    })
    .from(songs)
    .innerJoin(songbooks, eq(songs.songbookId, songbooks.id))
    .orderBy(desc(songs.createdAt), desc(songs.id))
    .limit(limit);

  return rows.map(({ sbId, sbTitle, sbSlug, ...r }) => ({
    ...r,
    songbook: { id: sbId, title: sbTitle, slug: sbSlug },
  }));
}

export async function searchSongsGlobal(
  db: DrizzleD1Database,
  opts: { q: string; limit?: number; offset?: number },
) {
  const { q, limit = 20, offset = 0 } = opts;
  const pattern = `%${q}%`;

  const condition = or(
    like(songs.title, pattern),
    like(sql`cast(${songs.number} as text)`, pattern),
    like(songParts.lyrics, pattern),
  );

  // SELECT DISTINCT eliminates duplicate song rows produced by the LEFT JOIN on songParts.
  // All selected columns come from songs/songbooks, so rows per matching song are identical.
  const rows = await db
    .selectDistinct({
      id: songs.id,
      number: songs.number,
      title: songs.title,
      author: songs.author,
      sbId: songbooks.id,
      sbTitle: songbooks.title,
      sbSlug: songbooks.slug,
    })
    .from(songs)
    .innerJoin(songbooks, eq(songs.songbookId, songbooks.id))
    .leftJoin(songParts, eq(songParts.songId, songs.id))
    .where(condition)
    .orderBy(asc(songs.number))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: sql<number>`count(distinct ${songs.id})` })
    .from(songs)
    .innerJoin(songbooks, eq(songs.songbookId, songbooks.id))
    .leftJoin(songParts, eq(songParts.songId, songs.id))
    .where(condition);

  return {
    items: rows.map(({ sbId, sbTitle, sbSlug, ...r }) => ({
      ...r,
      songbook: { id: sbId, title: sbTitle, slug: sbSlug },
    })),
    total: total ?? 0,
  };
}

export async function createSong(
  db: DrizzleD1Database,
  data: { songbookId: number; number: number; title: string; author?: string | null; copyright?: string | null },
) {
  const [song] = await db.insert(songs).values(data).returning();
  return song;
}

export async function updateSong(
  db: DrizzleD1Database,
  id: number,
  data: Partial<{ number: number; title: string; author: string | null; copyright: string | null }>,
) {
  const [song] = await db.update(songs).set({ ...data, updatedAt: new Date() }).where(eq(songs.id, id)).returning();
  return song ?? null;
}

export async function deleteSong(db: DrizzleD1Database, id: number) {
  const sheets = await db.select({ key: songSheets.key }).from(songSheets).where(eq(songSheets.songId, id));
  await db.delete(songSheets).where(eq(songSheets.songId, id));
  await db.delete(songParts).where(eq(songParts.songId, id));
  await db.delete(songs).where(eq(songs.id, id));
  return sheets.map((s) => s.key);
}

// ── Song Parts ────────────────────────────────────────────────────────────────

export async function createSongPart(
  db: DrizzleD1Database,
  data: {
    songId: number;
    type: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'coda';
    label: string;
    sortOrder: number;
    lyrics: string;
  },
) {
  const [part] = await db.insert(songParts).values(data).returning();
  const { songId: _s, ...rest } = part;
  return rest;
}

export async function updateSongPart(
  db: DrizzleD1Database,
  id: number,
  data: Partial<{ type: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'coda'; label: string; sortOrder: number; lyrics: string }>,
) {
  const [part] = await db.update(songParts).set(data).where(eq(songParts.id, id)).returning();
  if (!part) return null;
  const { songId: _s, ...rest } = part;
  return rest;
}

export async function deleteSongPart(db: DrizzleD1Database, id: number) {
  await db.delete(songParts).where(eq(songParts.id, id));
}

// ── Song Sheets ───────────────────────────────────────────────────────────────

export async function createSongSheet(
  db: DrizzleD1Database,
  data: { songId: number; key: string; type: 'pdf' | 'image'; sortOrder: number },
) {
  const [sheet] = await db.insert(songSheets).values(data).returning();
  const { songId: _s, uploadedAt: _u, ...rest } = sheet;
  return rest;
}

export async function getSongSheetById(db: DrizzleD1Database, id: number) {
  const [sheet] = await db.select().from(songSheets).where(eq(songSheets.id, id)).limit(1);
  return sheet ?? null;
}

export async function deleteSongSheet(db: DrizzleD1Database, id: number) {
  const sheet = await getSongSheetById(db, id);
  if (!sheet) return null;
  await db.delete(songSheets).where(eq(songSheets.id, id));
  return sheet;
}
