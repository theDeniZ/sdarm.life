import { API } from './api';

/**
 * Bible data comes from our own API, which proxies YouVersion server-side.
 * These shapes mirror the DTOs in `@sdarm/types`.
 */
export interface BibleTranslation {
  /** YouVersion Bible ID. */
  id: number;
  /** URL slug used in /bible/{code}/… */
  code: string;
  name: string;
  abbreviation: string;
  language: string;
  /** Publisher copyright notice — display wherever the text is shown. */
  copyright: string | null;
  /** Best-effort year parsed from the title; 0 when unknown. */
  year: number;
  /** Uses Septuagint Psalm numbering (drives parallel-mode chapter remapping). */
  lxxPsalms: boolean;
}

export type BibleTestament = 'OT' | 'NT';

export interface BibleBook {
  id: number;
  code: string;
  number: number;
  name: string;
  abbreviation: string;
  testament: BibleTestament;
  chapterCount: number;
}

export interface BibleVerse {
  verse: number;
  text: string;
}

export interface BibleChapter {
  translation: { code: string; name: string; copyright: string | null };
  book: BibleBook;
  chapter: number;
  verses: BibleVerse[];
}

export interface ParallelVerse {
  verse: number;
  a: string | null;
  b: string | null;
}

export interface ParallelChapter {
  bookCode: string;
  a: { code: string; name: string; chapter: number; copyright: string | null };
  b: { code: string; name: string; chapter: number; copyright: string | null };
  verses: ParallelVerse[];
}

interface FetchOpts {
  revalidate?: number;
}

// The API already caches YouVersion responses in KV and at the edge; these are
// the Next.js-side windows on top of that.
//
// Metadata is kept short because the translation list is driven by the admin
// allowlist — a long window would leave a newly enabled translation invisible
// on the site long after the operator saved it. Scripture text never changes,
// so chapters get a long window.
const METADATA_REVALIDATE = 300;
const CHAPTER_REVALIDATE = 86400;

export async function fetchTranslations(opts: FetchOpts = {}): Promise<BibleTranslation[]> {
  try {
    const res = await fetch(`${API}/bible/translations`, {
      next: { revalidate: opts.revalidate ?? METADATA_REVALIDATE },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items: BibleTranslation[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

/**
 * Pick a translation out of a list already fetched for the same render, rather
 * than asking the API for it again. Every avoided call here is one fewer
 * invocation of the API Worker per page view — the chapter page needs the full
 * list anyway for its compare picker. Matches the slug or the raw YouVersion
 * ID, because the API accepts either in the URL.
 */
export function findTranslation(list: BibleTranslation[], code: string): BibleTranslation | null {
  return list.find((t) => t.code === code || String(t.id) === code) ?? null;
}

export async function fetchTranslation(code: string): Promise<BibleTranslation | null> {
  try {
    const res = await fetch(`${API}/bible/translations/${code}`, { next: { revalidate: METADATA_REVALIDATE } });
    if (!res.ok) return null;
    return (await res.json()) as BibleTranslation;
  } catch {
    return null;
  }
}

export async function fetchBooks(code: string, opts: FetchOpts = {}): Promise<BibleBook[]> {
  try {
    const res = await fetch(`${API}/bible/translations/${code}/books`, {
      next: { revalidate: opts.revalidate ?? METADATA_REVALIDATE },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items: BibleBook[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

export async function fetchBook(code: string, bookCode: string): Promise<BibleBook | null> {
  try {
    const res = await fetch(`${API}/bible/translations/${code}/books/${bookCode}`, {
      next: { revalidate: METADATA_REVALIDATE },
    });
    if (!res.ok) return null;
    return (await res.json()) as BibleBook;
  } catch {
    return null;
  }
}

export async function fetchChapter(code: string, bookCode: string, chapter: number): Promise<BibleChapter | null> {
  try {
    const res = await fetch(`${API}/bible/translations/${code}/books/${bookCode}/chapters/${chapter}`, {
      next: { revalidate: CHAPTER_REVALIDATE },
    });
    if (!res.ok) return null;
    return (await res.json()) as BibleChapter;
  } catch {
    return null;
  }
}

/**
 * Also called from client components (presenter compare mode), where the
 * server-only API_URL is not inlined — those callers pass `apiBase`, threaded
 * down as a prop from the server page.
 */
export async function fetchParallelChapter(
  a: string,
  b: string,
  bookCode: string,
  chapter: number,
  apiBase: string = API
): Promise<ParallelChapter | null> {
  try {
    const params = new URLSearchParams({ a, b, book: bookCode, chapter: String(chapter) });
    const res = await fetch(`${apiBase}/bible/parallel?${params}`, { next: { revalidate: CHAPTER_REVALIDATE } });
    if (!res.ok) return null;
    return (await res.json()) as ParallelChapter;
  } catch {
    return null;
  }
}
