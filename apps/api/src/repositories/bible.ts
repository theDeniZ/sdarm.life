/**
 * Queries against `sdarm-bible` (the `BIBLE_DB` binding), not `sdarm-db`.
 *
 * Every function takes the drizzle instance for that database as its first
 * argument, like every other repository here. The binding is optional, so the
 * caller — `services/bible/local.ts` — is the one that decides whether there is
 * a database at all; nothing in this file guards for it.
 */
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { bibleBooks, bibleTranslations, bibleVerses } from '@sdarm/db/bible';

export type TranslationRecord = typeof bibleTranslations.$inferSelect;

/**
 * The rows for a set of prefixed ids, in no particular order.
 *
 * One query for the whole enabled set — the caller indexes the result by id.
 * A per-translation lookup would put a D1 round trip on every card of the
 * `/bible` landing page.
 */
export async function listTranslationRecords(
  db: DrizzleD1Database,
  ids: string[],
): Promise<TranslationRecord[]> {
  // `inArray(col, [])` is invalid Drizzle SQL — see docs/api.md.
  if (ids.length === 0) return [];
  return db.select().from(bibleTranslations).where(inArray(bibleTranslations.id, ids));
}

export async function getTranslationRecord(db: DrizzleD1Database, id: string): Promise<TranslationRecord | null> {
  const [row] = await db.select().from(bibleTranslations).where(eq(bibleTranslations.id, id)).limit(1);
  return row ?? null;
}

/** Every configured translation, both sources — Admin → Bible lists this. */
export async function listAllTranslationRecords(db: DrizzleD1Database): Promise<TranslationRecord[]> {
  return db
    .select()
    .from(bibleTranslations)
    .orderBy(asc(bibleTranslations.sortOrder), asc(bibleTranslations.slug));
}

export type BookRecord = typeof bibleBooks.$inferSelect;

export async function listBookRecords(db: DrizzleD1Database, translationId: string): Promise<BookRecord[]> {
  return db
    .select()
    .from(bibleBooks)
    .where(eq(bibleBooks.translationId, translationId))
    .orderBy(asc(bibleBooks.number));
}

export async function listChapterVerses(
  db: DrizzleD1Database,
  translationId: string,
  bookCode: string,
  chapter: number,
): Promise<{ verse: number; text: string }[]> {
  return db
    .select({ verse: bibleVerses.verse, text: bibleVerses.text })
    .from(bibleVerses)
    .where(
      and(
        eq(bibleVerses.translationId, translationId),
        eq(bibleVerses.book, bookCode),
        eq(bibleVerses.chapter, chapter),
      ),
    )
    .orderBy(asc(bibleVerses.verse));
}

/**
 * Every verse of one book, ordered by chapter then verse, in a single query —
 * used by the `/api/v1/llm/bible/:code/:book` agent endpoint, which renders
 * the whole book in one response rather than one chapter at a time.
 */
export async function listBookVerses(
  db: DrizzleD1Database,
  translationId: string,
  bookCode: string,
): Promise<{ chapter: number; verse: number; text: string }[]> {
  return db
    .select({ chapter: bibleVerses.chapter, verse: bibleVerses.verse, text: bibleVerses.text })
    .from(bibleVerses)
    .where(and(eq(bibleVerses.translationId, translationId), eq(bibleVerses.book, bookCode)))
    .orderBy(asc(bibleVerses.chapter), asc(bibleVerses.verse));
}

export interface SearchHitRow {
  translationId: string;
  book: string;
  chapter: number;
  verse: number;
  snippet: string;
}

/**
 * Full-text search over `bible_verses_fts`.
 *
 * Raw SQL because the FTS5 virtual table is hand-written (see
 * `packages/db/migrations-bible/0001_bible_fts.sql`) and drizzle has no schema
 * object for it. `snippet()` does the `<mark>` wrapping in SQLite, so the
 * matched terms come back already marked rather than being re-matched in JS
 * against a tokenizer that folds diacritics differently.
 */
export async function searchVerses(
  db: DrizzleD1Database,
  opts: { match: string; translationIds: string[]; book?: string; limit: number; offset: number },
): Promise<{ items: SearchHitRow[]; total: number }> {
  const { match, translationIds, book, limit, offset } = opts;
  if (translationIds.length === 0) return { items: [], total: 0 };

  const ids = sql.join(
    translationIds.map((id) => sql`${id}`),
    sql`, `,
  );
  const bookFilter = book ? sql` AND book = ${book}` : sql``;
  const where = sql`bible_verses_fts MATCH ${match} AND translation_id IN (${ids})${bookFilter}`;

  const totalRow = await db.get<{ total: number }>(
    sql`SELECT count(*) AS total FROM bible_verses_fts WHERE ${where}`,
  );

  const items = await db.all<SearchHitRow>(sql`
    SELECT translation_id AS translationId, book, chapter, verse,
           snippet(bible_verses_fts, 0, '<mark>', '</mark>', '…', 24) AS snippet
    FROM bible_verses_fts
    WHERE ${where}
    ORDER BY rank
    LIMIT ${limit} OFFSET ${offset}
  `);

  return { items, total: totalRow?.total ?? 0 };
}

// ── Admin writes ─────────────────────────────────────────────────────────────

export type CreateTranslationInput = {
  id: string;
  source: 'local' | 'youversion';
  slug: string;
  name: string;
  abbreviation: string;
  language: string;
  year: number;
  lxxPsalms: boolean;
  licenseBasis: 'public-domain' | 'permission' | 'provider';
  notice: string | null;
};

export async function createTranslationRecord(
  db: DrizzleD1Database,
  input: CreateTranslationInput,
): Promise<TranslationRecord> {
  const now = new Date();
  const [row] = await db
    .insert(bibleTranslations)
    .values({ ...input, createdAt: now, updatedAt: now })
    .returning();
  return row;
}

export type UpdateTranslationInput = Partial<
  Pick<
    TranslationRecord,
    | 'name'
    | 'slug'
    | 'abbreviation'
    | 'language'
    | 'year'
    | 'lxxPsalms'
    | 'sortOrder'
    | 'licenseBasis'
    | 'rightsHolder'
    | 'notice'
    | 'provenance'
    | 'permissionRef'
    | 'permissionDate'
    | 'allowDownload'
    | 'allowOffline'
    | 'allowSearchIndex'
    | 'allowProjector'
    | 'maxVersesPerRequest'
  >
>;

export async function updateTranslationRecord(
  db: DrizzleD1Database,
  id: string,
  data: UpdateTranslationInput,
): Promise<TranslationRecord | null> {
  const [row] = await db
    .update(bibleTranslations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(bibleTranslations.id, id))
    .returning();
  return row ?? null;
}
