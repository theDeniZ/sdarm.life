import type {
  BibleBookDto,
  BibleChapterDto,
  BibleLicenseDto,
  BibleTranslationDto,
  BibleVerseDto,
  ParallelChapterDto,
  ParallelVerseDto,
} from '@sdarm/types';
import { API } from './api';

/**
 * Bible data comes from our own API, which serves locally-hosted public-domain
 * texts and proxies YouVersion server-side.
 *
 * These are aliases of the DTOs in `@sdarm/types` rather than a second set of
 * interfaces. The app carried its own copies until the license fields landed,
 * and the copies had already lost `license`, `truncated` and the prefixed
 * string id — a mirror that is maintained by hand drifts, and a license field
 * that goes missing in the mirror is a license field that never reaches a page.
 */
export type BibleTranslation = BibleTranslationDto;
export type BibleLicense = BibleLicenseDto;
export type BibleBook = BibleBookDto;
export type BibleVerse = BibleVerseDto;
export type BibleChapter = BibleChapterDto;
export type ParallelVerse = ParallelVerseDto;
export type ParallelChapter = ParallelChapterDto;

/**
 * The line that must appear wherever this translation's text is displayed.
 *
 * `notice` is the rights holder's own wording and is rendered verbatim — never
 * reformatted, shortened or translated. A public-domain text has no notice and
 * falls back to `provenance`, so it still says where the text came from: that
 * is the difference between "we checked" and "we did not think about it".
 */
export function licenseNotice(license: BibleLicense): string | null {
  return license.notice ?? license.provenance;
}

interface FetchOpts {
  revalidate?: number;
}

// The API already caches upstream responses in KV and at the edge; these are
// the Next.js-side windows on top of that.
//
// Metadata is kept short because the translation list is driven by the admin
// allowlist — a long window would leave a newly enabled translation invisible
// on the site long after the operator saved it, and would keep serving one the
// operator has just taken down. Scripture text never changes, so chapters get
// a long window.
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
 * list anyway for its compare picker.
 *
 * Matches the slug or the prefixed id, because the API accepts either in the
 * URL. A bare number is still accepted too: links minted before the ids were
 * prefixed carry the raw YouVersion number, and the API still resolves those.
 */
export function findTranslation(list: BibleTranslation[], code: string): BibleTranslation | null {
  return list.find((t) => t.code === code || t.id === code || t.id === `yv:${code}`) ?? null;
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

export async function fetchBooks(code: string, opts: FetchOpts = {}, apiBase: string = API): Promise<BibleBook[]> {
  try {
    const res = await fetch(`${apiBase}/bible/translations/${code}/books`, {
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

/**
 * `projector` asks the API to refuse a translation whose license keeps it off
 * a shared screen (403 → null here). Every fetch that feeds the projector sets
 * it, so the gate holds in the API rather than in a component.
 */
export async function fetchChapter(
  code: string,
  bookCode: string,
  chapter: number,
  opts: { projector?: boolean; apiBase?: string } = {}
): Promise<BibleChapter | null> {
  try {
    const query = opts.projector ? '?use=projector' : '';
    const res = await fetch(
      `${opts.apiBase ?? API}/bible/translations/${code}/books/${bookCode}/chapters/${chapter}${query}`,
      { next: { revalidate: CHAPTER_REVALIDATE } }
    );
    if (!res.ok) return null;
    return (await res.json()) as BibleChapter;
  } catch {
    return null;
  }
}

/**
 * 2–4 translations of one chapter aligned by verse, primary first.
 *
 * Also called from client components (the presenter console), where the
 * server-only API_URL is not inlined — those callers pass `apiBase`, threaded
 * down as a prop from the server page.
 */
export async function fetchParallelChapter(
  codes: string[],
  bookCode: string,
  chapter: number,
  opts: { projector?: boolean; apiBase?: string } = {}
): Promise<ParallelChapter | null> {
  try {
    const params = new URLSearchParams({ t: codes.join(','), book: bookCode, chapter: String(chapter) });
    if (opts.projector) params.set('use', 'projector');
    const res = await fetch(`${opts.apiBase ?? API}/bible/parallel?${params}`, {
      next: { revalidate: CHAPTER_REVALIDATE },
    });
    if (!res.ok) return null;
    return (await res.json()) as ParallelChapter;
  } catch {
    return null;
  }
}

/**
 * The extra translations named in a chapter URL, in order: `?with=a,b,c`, or
 * the older single `?compare=b`. The page's own translation and repeats are
 * dropped, and at most three extras are kept (four on screen in all).
 */
export function extraTranslationCodes(primary: string, params: { with?: string; compare?: string }): string[] {
  const raw = params.with ? params.with.split(',') : params.compare ? [params.compare] : [];
  const out: string[] = [];
  for (const c of raw.map((s) => s.trim())) {
    if (c && c !== primary && !out.includes(c)) out.push(c);
  }
  return out.slice(0, 3);
}
