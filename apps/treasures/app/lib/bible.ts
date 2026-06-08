import { API } from './api';

export interface BibleTranslation {
  id: number;
  code: string;
  name: string;
  language: string;
  year: number;
  copyright: string | null;
  license: string;
  treasureId: number;
  description: string | null;
  coverGradient: string | null;
  coverAccentColor: string | null;
  coverKey: string | null;
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
  translation: { code: string; name: string };
  book: BibleBook;
  chapter: number;
  verses: BibleVerse[];
}

interface FetchOpts {
  revalidate?: number;
}
const DEFAULT_METADATA_REVALIDATE = 86400;

export async function fetchTranslations(opts: FetchOpts = {}): Promise<BibleTranslation[]> {
  try {
    const res = await fetch(`${API}/bible/translations`, {
      next: { revalidate: opts.revalidate ?? DEFAULT_METADATA_REVALIDATE },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items: BibleTranslation[] };
    return data.items;
  } catch {
    return [];
  }
}

export async function fetchTranslation(code: string): Promise<BibleTranslation | null> {
  try {
    const res = await fetch(`${API}/bible/translations/${code}`, {
      next: { revalidate: DEFAULT_METADATA_REVALIDATE },
    });
    if (!res.ok) return null;
    return (await res.json()) as BibleTranslation;
  } catch {
    return null;
  }
}

export async function fetchBooks(code: string, opts: FetchOpts = {}): Promise<BibleBook[]> {
  try {
    const res = await fetch(`${API}/bible/translations/${code}/books`, {
      next: { revalidate: opts.revalidate ?? DEFAULT_METADATA_REVALIDATE },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items: BibleBook[] };
    return data.items;
  } catch {
    return [];
  }
}

export async function fetchBook(code: string, bookCode: string): Promise<BibleBook | null> {
  try {
    const res = await fetch(`${API}/bible/translations/${code}/books/${bookCode}`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return (await res.json()) as BibleBook;
  } catch {
    return null;
  }
}

export async function fetchChapter(code: string, bookCode: string, chapter: number): Promise<BibleChapter | null> {
  try {
    const res = await fetch(`${API}/bible/translations/${code}/books/${bookCode}/chapters/${chapter}`, {
      next: { revalidate: 31536000 },
    });
    if (!res.ok) return null;
    return (await res.json()) as BibleChapter;
  } catch {
    return null;
  }
}

export interface ParallelVerse {
  verse: number;
  a: string | null;
  b: string | null;
}

export interface ParallelChapter {
  bookCode: string;
  a: { code: string; name: string; chapter: number };
  b: { code: string; name: string; chapter: number };
  verses: ParallelVerse[];
}

export async function fetchParallelChapter(
  a: string,
  b: string,
  bookCode: string,
  chapter: number
): Promise<ParallelChapter | null> {
  try {
    const params = new URLSearchParams({ a, b, book: bookCode, chapter: String(chapter) });
    const res = await fetch(`${API}/bible/parallel?${params}`, { next: { revalidate: 31536000 } });
    if (!res.ok) return null;
    return (await res.json()) as ParallelChapter;
  } catch {
    return null;
  }
}
