import type { Bindings } from '../../types';
import type { BibleTestament } from '@sdarm/types';

// ─── Types matching our internal Bible DTOs ───────────────────────────────────
//
// These shapes mirror the public DTOs in `apps/api/src/schemas.ts`. The
// YouVersion client returns these directly so the source layer can hand them
// to the route handlers without further transformation.

export type TranslationRow = {
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
};

export type BookRow = {
	id: number;
	code: string;
	number: number;
	name: string;
	abbreviation: string;
	testament: BibleTestament;
	chapterCount: number;
};

export type ChapterShape = {
	translation: { code: string; name: string };
	book: BookRow;
	chapter: number;
	verses: { verse: number; text: string }[];
};

export type ParallelShape = {
	bookCode: string;
	a: { code: string; name: string; chapter: number };
	b: { code: string; name: string; chapter: number };
	verses: { verse: number; a: string | null; b: string | null }[];
};

// ─── Code map ─────────────────────────────────────────────────────────────────
//
// We expose human-readable translation codes in URLs (`luther1912`, `kjv`,
// `synodal`). YouVersion uses numeric Bible IDs. New YV translations not in
// this map are exposed under a slugified `{abbreviation}-{language}` code that
// the catalog endpoint computes deterministically — see `mapYvTranslation` below.
//
// Verified live against api.youversion.com on 2026-05-06.
export const YOUVERSION_CODE_MAP: Record<string, number> = {
	kjv: 1, // King James Version (en)
	luther1912: 51, // Lutherbibel 1912 / DELUT (de)
	synodal: 400, // Синодальный перевод / SYNO (ru, Protestant edition 1994)
};

// USFM book codes used by eBible (and by our D1 fallback). YouVersion may use
// the slightly different USFM-3 set (`JHN` vs `JOH`, `MRK` vs `MAR`). Translate
// here on the way in/out. Only entries that actually differ are listed.
const BOOK_CODE_TO_YV: Record<string, string> = {
	JOH: 'JHN',
	MAR: 'MRK',
	'1JO': '1JN',
	'2JO': '2JN',
	'3JO': '3JN',
	SOL: 'SNG',
	PHI: 'PHP',
};
const YV_TO_BOOK_CODE: Record<string, string> = Object.fromEntries(
	Object.entries(BOOK_CODE_TO_YV).map(([ours, yv]) => [yv, ours]),
);

function ourBookToYv(code: string): string {
	return BOOK_CODE_TO_YV[code] ?? code;
}

function yvBookToOurs(code: string): string {
	return YV_TO_BOOK_CODE[code] ?? code;
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

const YV_BASE = 'https://api.youversion.com/v1';
const TIMEOUT_MS = 5000;

/**
 * Single fetch helper for YouVersion. Returns parsed JSON on 2xx, null on any
 * failure (missing key, network error, non-2xx, JSON parse error).
 *
 * The silent-fallback behaviour is intentional: when the API key is unset
 * (e.g. local dev) or YV is unreachable, the source layer transparently falls
 * back to D1 without surfacing an error to the caller.
 */
async function yvFetch<T = unknown>(
	env: Bindings,
	path: string,
	params?: Record<string, string | number | string[]>,
): Promise<T | null> {
	const apiKey = env.YOUVERSION_API_KEY;
	if (!apiKey) return null;

	const url = new URL(`${YV_BASE}${path}`);
	if (params) {
		for (const [k, v] of Object.entries(params)) {
			if (Array.isArray(v)) for (const item of v) url.searchParams.append(k, item);
			else url.searchParams.set(k, String(v));
		}
	}

	const ctrl = new AbortController();
	const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

	try {
		const res = await fetch(url.toString(), {
			method: 'GET',
			headers: {
				'X-YVP-App-Key': apiKey,
				Accept: 'application/json',
			},
			signal: ctrl.signal,
		});
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

// ─── Response types ───────────────────────────────────────────────────────────
//
// Shapes verified live against api.youversion.com on 2026-05-06 using the
// developer key. All endpoints return JSON with snake_case fields.

type YvBibleListResponse = {
	data: YvBible[];
	total_size: number;
	next_page_token: string | null;
};

type YvBible = {
	id: number;
	abbreviation: string;
	localized_abbreviation: string;
	title: string;
	localized_title: string;
	language_tag: string; // BCP-47 short tag, e.g. "en"
	copyright: string | null;
	publisher_url: string | null;
	info: unknown;
	books?: string[]; // USFM codes when included in list mode
};

type YvBookListResponse = { data: YvBookMeta[] };

type YvBookMeta = {
	id: string; // USFM code, e.g. "GEN", "JHN"
	title: string;
	full_title: string;
	abbreviation: string;
	canon: 'old_testament' | 'new_testament';
	chapters?: { id: string; passage_id: string; title: string; verses?: unknown[] }[];
};

type YvPassageHtml = {
	id: string;
	content: string; // HTML with verse markers: <span class="yv-v" v="N"></span><span class="yv-vlbl">N</span>...
	reference?: string;
};

function slugifyTranslation(b: YvBible): string {
	const abbr = (b.localized_abbreviation || b.abbreviation || '').toLowerCase();
	const lang = (b.language_tag || '').toLowerCase();
	if (abbr && lang) return `${abbr}-${lang}`;
	if (abbr) return abbr;
	return `yv-${b.id}`;
}

/**
 * Pseudo-ID for YouVersion translations not in `treasures`. We use a high
 * negative space (-1, -2, …) to avoid colliding with D1 IDs. Stable per
 * YV Bible ID via simple hash.
 */
function pseudoTreasureId(yvId: number | string): number {
	const n = typeof yvId === 'number' ? yvId : Number.parseInt(String(yvId), 10) || 0;
	// negative range, deterministic per yvId
	return -Math.abs(n) - 1000000;
}

function mapYvTranslation(b: YvBible): TranslationRow {
	const humanCode = Object.entries(YOUVERSION_CODE_MAP).find(([, id]) => id === b.id)?.[0];
	const code = humanCode ?? slugifyTranslation(b);
	const name = b.localized_title || b.title || code;
	// YV doesn't return year as a field. Many translations include it in the
	// localized title ("Lutherbibel 1912", "Elberfelder 1871"). Best-effort.
	const yearMatch = (b.localized_title || b.title || '').match(/\b(1[5-9]\d{2}|20\d{2})\b/);
	const year = yearMatch ? Number(yearMatch[1]) : 0;

	return {
		id: b.id,
		code,
		name,
		language: b.language_tag,
		year,
		copyright: b.copyright,
		license: '',
		treasureId: pseudoTreasureId(b.id),
		description: null,
		coverGradient: null,
		coverAccentColor: null,
		coverKey: null,
	};
}

function mapYvBook(yvb: YvBookMeta, fallbackNumber: number): BookRow {
	const yvCode = yvb.id.toUpperCase();
	const code = yvBookToOurs(yvCode);
	const chapterCount = Array.isArray(yvb.chapters) ? yvb.chapters.length : 0;
	const testament: BibleTestament = yvb.canon === 'new_testament' ? 'NT' : 'OT';
	return {
		id: fallbackNumber,
		code,
		number: fallbackNumber,
		name: yvb.title,
		abbreviation: yvb.abbreviation,
		testament,
		chapterCount,
	};
}

/**
 * Parse a YouVersion HTML passage into verse-by-verse text.
 *
 * Format observed live (2026-05-06): the chapter content is one HTML string
 * with verse markers in the form
 *
 *   <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Verse 1 text…
 *   <span class="yv-v" v="2"></span><span class="yv-vlbl">2</span>Verse 2 text…
 *
 * We split on the `yv-v` marker (which carries the verse number in its `v=`
 * attribute), strip the visible label span, and clean any remaining HTML tags.
 */
function parseHtmlPassage(html: string): { verse: number; text: string }[] {
	const verseMarker = /<span class="yv-v" v="(\d+)"[^>]*><\/span>/g;
	const matches: { idx: number; verse: number; markerEnd: number }[] = [];
	let m: RegExpExecArray | null;
	while ((m = verseMarker.exec(html)) !== null) {
		matches.push({ idx: m.index, verse: Number(m[1]), markerEnd: m.index + m[0].length });
	}
	if (matches.length === 0) return [];

	const verses: { verse: number; text: string }[] = [];
	for (let i = 0; i < matches.length; i++) {
		const start = matches[i].markerEnd;
		const end = i + 1 < matches.length ? matches[i + 1].idx : html.length;
		const slice = html
			.slice(start, end)
			.replace(/<span class="yv-vlbl"[^>]*>\d+<\/span>/g, '') // strip visible verse-label span
			.replace(/<[^>]+>/g, '') // strip remaining HTML tags
			.replace(/\s+/g, ' ')
			.trim();
		if (slice) verses.push({ verse: matches[i].verse, text: slice });
	}
	return verses;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch the full YouVersion bible catalog. The endpoint paginates at 100 items
 * per page (max), so we loop with `next_page_token` until exhausted.
 *
 * Production catalog size is ~1,500 bibles in ~1,250 languages, requiring ~15
 * round-trips that take roughly 10-12 seconds end-to-end. The result is cached
 * in KV for 1 day, so this only runs on cold cache misses.
 *
 * MAX_PAGES is a safety cap; if YouVersion ever publishes >5,000 translations
 * we'd want to revisit this anyway.
 */
const PAGE_SIZE = 100;
const MAX_PAGES = 50;

export async function listTranslations(env: Bindings): Promise<TranslationRow[] | null> {
	const all: YvBible[] = [];
	let token: string | null = null;
	let pages = 0;

	while (pages < MAX_PAGES) {
		const params: Record<string, string | string[]> = {
			'language_ranges[]': ['*'],
			page_size: String(PAGE_SIZE),
		};
		if (token) params.page_token = token;

		const data: YvBibleListResponse | null = await yvFetch<YvBibleListResponse>(env, '/bibles', params);
		if (!data?.data) {
			// First-page failure → treat as full failure so the source layer falls
			// back to D1. Mid-pagination failure → return what we have so far.
			if (pages === 0) return null;
			break;
		}
		all.push(...data.data);
		token = data.next_page_token;
		pages++;
		if (!token) break;
	}

	return all.map(mapYvTranslation);
}

export async function listBooks(env: Bindings, translationCode: string): Promise<BookRow[] | null> {
	const yvId = YOUVERSION_CODE_MAP[translationCode];
	if (yvId == null) return null;
	const data = await yvFetch<YvBookListResponse>(env, `/bibles/${yvId}/books`);
	if (!data?.data) return null;
	return data.data.map((b, i) => mapYvBook(b, i + 1));
}

export async function getChapter(env: Bindings, translationCode: string, bookCode: string, chapter: number): Promise<ChapterShape | null> {
	const yvId = YOUVERSION_CODE_MAP[translationCode];
	if (yvId == null) return null;
	const yvBook = ourBookToYv(bookCode);
	const passageId = `${yvBook}.${chapter}`;
	const data = await yvFetch<YvPassageHtml>(env, `/bibles/${yvId}/passages/${passageId}`, { format: 'html' });
	if (!data?.content) return null;

	const verses = parseHtmlPassage(data.content);
	if (verses.length === 0) return null;

	const books = await listBooks(env, translationCode);
	const book = books?.find((b) => b.code === bookCode);
	if (!book) return null;
	if (chapter < 1 || chapter > book.chapterCount) return null;

	const translations = await listTranslations(env);
	const translation = translations?.find((t) => t.code === translationCode);
	const translationName = translation?.name ?? translationCode;

	return {
		translation: { code: translationCode, name: translationName },
		book,
		chapter,
		verses,
	};
}

export async function getParallelChapter(
	env: Bindings,
	codeA: string,
	codeB: string,
	bookCode: string,
	chapter: number,
): Promise<ParallelShape | null> {
	// YouVersion does not expose a single parallel endpoint; fetch both sides.
	const [chA, chB] = await Promise.all([getChapter(env, codeA, bookCode, chapter), getChapter(env, codeB, bookCode, chapter)]);
	if (!chA || !chB) return null;

	const map = new Map<number, { verse: number; a: string | null; b: string | null }>();
	for (const v of chA.verses) map.set(v.verse, { verse: v.verse, a: v.text, b: null });
	for (const v of chB.verses) {
		const existing = map.get(v.verse);
		if (existing) existing.b = v.text;
		else map.set(v.verse, { verse: v.verse, a: null, b: v.text });
	}
	const verses = [...map.values()].sort((x, y) => x.verse - y.verse);
	return {
		bookCode,
		a: { code: chA.translation.code, name: chA.translation.name, chapter },
		b: { code: chB.translation.code, name: chB.translation.name, chapter },
		verses,
	};
}
