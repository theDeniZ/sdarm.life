import { and, asc, count, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { bibleTranslations, treasures } from '@sdarm/db';

type Row = typeof treasures.$inferSelect & { bibleCode?: string | null };

function row(r: Row) {
  return {
    id: r.id,
    title: r.title,
    author: r.author ?? null,
    description: r.description ?? null,
    type: r.type,
    language: r.language,
    coverGradient: r.coverGradient ?? null,
    coverAccentColor: r.coverAccentColor ?? null,
    coverKey: r.coverKey ?? null,
    isFree: r.isFree,
    price: r.price ?? null,
    sortOrder: r.sortOrder,
    epubUrl: r.epubUrl ?? null,
    bibleCode: r.bibleCode ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

const listSelect = {
  id: treasures.id,
  title: treasures.title,
  author: treasures.author,
  description: treasures.description,
  type: treasures.type,
  language: treasures.language,
  coverGradient: treasures.coverGradient,
  coverAccentColor: treasures.coverAccentColor,
  coverKey: treasures.coverKey,
  isFree: treasures.isFree,
  price: treasures.price,
  sortOrder: treasures.sortOrder,
  epubUrl: treasures.epubUrl,
  createdAt: treasures.createdAt,
  updatedAt: treasures.updatedAt,
  bibleCode: bibleTranslations.code,
};

export async function listTreasures(
  db: DrizzleD1Database,
  opts: { type?: string; language?: string; limit?: number; offset?: number } = {},
) {
  const { limit = 50, offset = 0, type, language } = opts;
  const where = and(
    type ? eq(treasures.type, type as 'book' | 'bible') : undefined,
    language ? eq(treasures.language, language) : undefined,
  );
  const [{ total }] = await db.select({ total: count() }).from(treasures).where(where);
  const rows = await db
    .select(listSelect)
    .from(treasures)
    .leftJoin(bibleTranslations, eq(bibleTranslations.treasureId, treasures.id))
    .where(where)
    .orderBy(asc(treasures.sortOrder), asc(treasures.id))
    .limit(limit)
    .offset(offset);
  return { items: rows.map(row), total };
}

export async function getTreasureById(db: DrizzleD1Database, id: number) {
  const [r] = await db
    .select(listSelect)
    .from(treasures)
    .leftJoin(bibleTranslations, eq(bibleTranslations.treasureId, treasures.id))
    .where(eq(treasures.id, id));
  return r ? row(r) : null;
}

export interface CreateTreasureInput {
  title: string;
  author?: string | null;
  description?: string | null;
  type?: 'book' | 'bible';
  language: string;
  coverGradient?: string | null;
  coverAccentColor?: string | null;
  coverKey?: string | null;
  isFree?: boolean;
  price?: string | null;
  sortOrder?: number;
  epubUrl?: string | null;
}

export async function createTreasure(db: DrizzleD1Database, data: CreateTreasureInput) {
  const [r] = await db
    .insert(treasures)
    .values({
      title: data.title,
      author: data.author ?? null,
      description: data.description ?? null,
      type: data.type ?? 'book',
      language: data.language,
      coverGradient: data.coverGradient ?? null,
      coverAccentColor: data.coverAccentColor ?? null,
      coverKey: data.coverKey ?? null,
      isFree: data.isFree ?? true,
      price: data.price ?? null,
      sortOrder: data.sortOrder ?? 0,
      epubUrl: data.epubUrl ?? null,
    })
    .returning();
  return row(r);
}

export async function updateTreasure(db: DrizzleD1Database, id: number, data: Partial<CreateTreasureInput>) {
  const [r] = await db
    .update(treasures)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(treasures.id, id))
    .returning();
  return r ? row(r) : null;
}

export async function deleteTreasure(db: DrizzleD1Database, id: number) {
  await db.delete(treasures).where(eq(treasures.id, id));
}
