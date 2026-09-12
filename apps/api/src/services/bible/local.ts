/**
 * The locally-hosted Bible provider — verses we store ourselves in the
 * `sdarm-bible` D1, mirroring the function set of `youversion.ts` so that
 * `catalog.ts` can dispatch between the two on a translation's id prefix.
 *
 * ⚠️ `BIBLE_DB` is optional. Every function here returns empty or null when the
 * binding is absent rather than throwing, and that is the whole point: it is
 * what lets this code ship to a production Worker whose database does not exist
 * yet. Such an environment serves the YouVersion translations exactly as before
 * and simply has no local ones.
 */
import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import type { BibleBookDto, BibleLicenseDto } from '@sdarm/types';
import type { Bindings } from '../../types';
import * as repo from '../../repositories/bible';

/** The drizzle handle for `sdarm-bible`, or null when the binding is absent. */
export function bibleDb(env: Bindings): DrizzleD1Database | null {
  return env.BIBLE_DB ? drizzle(env.BIBLE_DB) : null;
}

export type TranslationRecord = repo.TranslationRecord;

export function licenseOf(r: TranslationRecord): BibleLicenseDto {
  return {
    basis: r.licenseBasis,
    rightsHolder: r.rightsHolder ?? null,
    notice: r.notice ?? null,
    provenance: r.provenance ?? null,
    allowDownload: r.allowDownload,
    allowOffline: r.allowOffline,
    allowSearchIndex: r.allowSearchIndex,
    allowProjector: r.allowProjector,
    maxVersesPerRequest: r.maxVersesPerRequest ?? null,
  };
}

/**
 * The stored records for a set of prefixed ids, indexed by id.
 *
 * Used for both sources: a YouVersion translation may have a row here purely so
 * its license record and gates are editable in Admin → Bible.
 */
export async function getRecords(env: Bindings, ids: string[]): Promise<Map<string, TranslationRecord>> {
  const db = bibleDb(env);
  if (!db || ids.length === 0) return new Map();
  try {
    const rows = await repo.listTranslationRecords(db, ids);
    return new Map(rows.map((r) => [r.id, r]));
  } catch {
    return new Map();
  }
}

export async function getRecord(env: Bindings, id: string): Promise<TranslationRecord | null> {
  const db = bibleDb(env);
  if (!db) return null;
  try {
    return await repo.getTranslationRecord(db, id);
  } catch {
    return null;
  }
}

export async function listAllRecords(env: Bindings): Promise<TranslationRecord[]> {
  const db = bibleDb(env);
  if (!db) return [];
  try {
    return await repo.listAllTranslationRecords(db);
  } catch {
    return [];
  }
}

export async function listBooks(env: Bindings, translationId: string): Promise<BibleBookDto[]> {
  const db = bibleDb(env);
  if (!db) return [];
  try {
    const rows = await repo.listBookRecords(db, translationId);
    return rows.map((b) => ({
      id: b.id,
      code: b.code,
      number: b.number,
      name: b.name,
      abbreviation: b.abbreviation,
      testament: b.testament,
      chapterCount: b.chapterCount,
    }));
  } catch {
    return [];
  }
}

export async function getChapterVerses(
  env: Bindings,
  translationId: string,
  bookCode: string,
  chapter: number,
): Promise<{ verse: number; text: string }[] | null> {
  const db = bibleDb(env);
  if (!db) return null;
  try {
    const verses = await repo.listChapterVerses(db, translationId, bookCode, chapter);
    return verses.length > 0 ? verses : null;
  } catch {
    return null;
  }
}

/**
 * Turn a user's query into an FTS5 MATCH expression.
 *
 * Raw input cannot go in: `AND`, `"`, `*`, `NEAR(` and a bare `-` are FTS5
 * syntax, and a malformed expression is a SQL error, not an empty result. Every
 * term is quoted as a literal and only the last one gets a prefix `*`, so
 * "gnade unse" finds "Gnade unser" while the reader is still typing.
 */
export function ftsMatch(q: string): string {
  const terms = q
    .split(/\s+/)
    .map((t) => t.replace(/["*():^\-+]/g, '').trim())
    .filter(Boolean);
  if (terms.length === 0) return '';
  return terms.map((t, i) => (i === terms.length - 1 ? `"${t}"*` : `"${t}"`)).join(' ');
}

export async function search(
  env: Bindings,
  opts: { q: string; translationIds: string[]; book?: string; limit: number; offset: number },
): Promise<{ items: repo.SearchHitRow[]; total: number }> {
  const db = bibleDb(env);
  const match = ftsMatch(opts.q);
  if (!db || !match || opts.translationIds.length === 0) return { items: [], total: 0 };
  try {
    return await repo.searchVerses(db, { ...opts, match });
  } catch {
    // A search that fails is an empty result page, never a 500 over scripture.
    return { items: [], total: 0 };
  }
}
