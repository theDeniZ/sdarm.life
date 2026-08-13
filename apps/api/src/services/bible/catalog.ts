/**
 * Resolves the operator-curated set of Bible translations.
 *
 * The only persisted state for the whole Bible feature is the `bible_translations`
 * config key in Workers KV — a JSON array of YouVersion Bible IDs written by
 * Admin → Bible. Everything else (titles, books, verses) is fetched from
 * YouVersion on demand and cached.
 */
import { resolveParallelPsalmChapters } from '@sdarm/types';
import type { Bindings } from '../../types';
import { BIBLE_TTL, kvKey, withCache } from './cache';
import * as yv from './youversion';

export type Translation = yv.TranslationRow;

/** Reads the enabled YouVersion Bible IDs from the KV config object. */
export async function getEnabledIds(env: Bindings): Promise<number[]> {
  try {
    const config = await env.KV.get<Record<string, string | null>>('config', 'json');
    const raw = config?.bible_translations;
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  } catch {
    return [];
  }
}

/**
 * Full metadata for one enabled translation. Two cached YouVersion calls:
 * the Bible record (title/abbreviation/copyright) and the books payload, which
 * is also where the LXX-Psalm flag is detected.
 *
 * A missing books payload fails the whole translation rather than defaulting
 * `lxxPsalms` to `false`. Defaulting would describe a Septuagint-numbered Bible
 * as Hebrew-numbered, and parallel mode would then align Psalm 23 against the
 * wrong psalm and return it as a confident 200 — edge-cached for a day. Dropping
 * the translation instead surfaces as the reader's unavailable state, which is
 * recoverable; silently wrong scripture is not.
 */
async function loadTranslation(env: Bindings, id: number): Promise<Translation | null> {
  const [bible, books] = await Promise.all([
    withCache(env, kvKey.bible(id), BIBLE_TTL.bible, () => yv.getBible(env, id)),
    withCache(env, kvKey.books(id), BIBLE_TTL.books, () => yv.getBooks(env, id)),
  ]);
  if (!bible || !books) return null;
  return {
    id: bible.id,
    code: bible.code,
    name: bible.name,
    abbreviation: bible.abbreviation,
    language: bible.language,
    copyright: bible.copyright,
    year: parseYearFromName(bible.name),
    lxxPsalms: books.lxxPsalms,
  };
}

function parseYearFromName(name: string): number {
  const m = name.match(/\b(1[4-9]\d{2}|20\d{2})\b/);
  return m ? Number(m[1]) : 0;
}

/** All enabled translations, in the order the operator configured them. */
export async function listTranslations(env: Bindings): Promise<Translation[]> {
  const ids = await getEnabledIds(env);
  if (ids.length === 0) return [];
  const rows = await Promise.all(ids.map((id) => loadTranslation(env, id)));
  return rows.filter((r): r is Translation => r !== null);
}

/** Resolve a URL code to an enabled translation. Accepts the slug or the raw YouVersion ID. */
export async function resolveTranslation(env: Bindings, code: string): Promise<Translation | null> {
  const all = await listTranslations(env);
  const byCode = all.find((t) => t.code === code);
  if (byCode) return byCode;
  const asId = Number(code);
  return Number.isInteger(asId) ? (all.find((t) => t.id === asId) ?? null) : null;
}

export async function listBooks(env: Bindings, translation: Translation): Promise<yv.BookRow[]> {
  const payload = await withCache(env, kvKey.books(translation.id), BIBLE_TTL.books, () => yv.getBooks(env, translation.id));
  return payload?.books ?? [];
}

export interface Chapter {
  translation: { code: string; name: string; copyright: string | null };
  book: yv.BookRow;
  chapter: number;
  verses: { verse: number; text: string }[];
}

export async function getChapter(env: Bindings, translation: Translation, bookCode: string, chapter: number): Promise<Chapter | null> {
  const books = await listBooks(env, translation);
  const book = books.find((b) => b.code === bookCode.toUpperCase());
  if (!book) return null;
  if (chapter < 1 || chapter > book.chapterCount) return null;

  const verses = await withCache(env, kvKey.chapter(translation.id, book.code, chapter), BIBLE_TTL.chapter, () =>
    yv.getChapterVerses(env, translation.id, book.code, chapter),
  );
  if (!verses) return null;

  return {
    translation: { code: translation.code, name: translation.name, copyright: translation.copyright },
    book,
    chapter,
    verses,
  };
}

export interface ParallelChapter {
  bookCode: string;
  a: { code: string; name: string; chapter: number; copyright: string | null };
  b: { code: string; name: string; chapter: number; copyright: string | null };
  verses: { verse: number; a: string | null; b: string | null }[];
}

export async function getParallelChapter(
  env: Bindings,
  a: Translation,
  b: Translation,
  bookCode: string,
  chapter: number,
): Promise<ParallelChapter | null> {
  // Psalms are numbered differently between LXX and Hebrew traditions; map the
  // B side so both columns show the same psalm.
  const { chapterA, chapterB } = resolveParallelPsalmChapters(a.lxxPsalms, b.lxxPsalms, bookCode.toUpperCase(), chapter);
  const [chA, chB] = await Promise.all([getChapter(env, a, bookCode, chapterA), getChapter(env, b, bookCode, chapterB)]);
  if (!chA || !chB) return null;

  const merged = new Map<number, { verse: number; a: string | null; b: string | null }>();
  for (const v of chA.verses) merged.set(v.verse, { verse: v.verse, a: v.text, b: null });
  for (const v of chB.verses) {
    const existing = merged.get(v.verse);
    if (existing) existing.b = v.text;
    else merged.set(v.verse, { verse: v.verse, a: null, b: v.text });
  }

  return {
    bookCode: chA.book.code,
    a: { code: a.code, name: a.name, chapter: chapterA, copyright: a.copyright },
    b: { code: b.code, name: b.name, chapter: chapterB, copyright: b.copyright },
    verses: [...merged.values()].sort((x, y) => x.verse - y.verse),
  };
}
