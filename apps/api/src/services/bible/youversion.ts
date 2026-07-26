/**
 * YouVersion Platform API client.
 *
 * Everything Bible-related is fetched from YouVersion at request time and
 * cached in Workers KV — nothing is stored in D1. All calls happen inside the
 * Worker so the app key never reaches the browser and the visitor's IP is
 * never exposed to YouVersion (see docs/dsgvo.md).
 *
 * Endpoint shapes verified live against api.youversion.com on 2026-07-25.
 */
import type { BibleTestament } from '@sdarm/types';
import type { Bindings } from '../../types';

const YV_BASE = 'https://api.youversion.com/v1';
const TIMEOUT_MS = 8000;
/** The API rejects page_size >= 100. */
export const MAX_PAGE_SIZE = 99;

// ─── Wire types (snake_case, as returned by YouVersion) ───────────────────────

interface YvBible {
  id: number;
  abbreviation: string;
  localized_abbreviation: string | null;
  title: string;
  localized_title: string | null;
  language_tag: string;
  copyright: string | null;
  books?: string[];
}

interface YvBibleListResponse {
  data: YvBible[];
  total_size: number;
  next_page_token: string | null;
}

interface YvChapter {
  id: string;
  passage_id: string;
  title: string;
  verses?: { id: string }[];
}

interface YvBookMeta {
  id: string; // USFM code
  title: string;
  full_title: string;
  abbreviation: string;
  canon: 'old_testament' | 'new_testament' | string;
  chapters?: YvChapter[];
}

interface YvPassage {
  id: string;
  content: string;
}

interface YvLicense {
  id: string;
  name: string;
  organization?: { name?: string | null } | string | null;
  bible_ids?: number[];
}

interface YvLicenseListResponse {
  data: YvLicense[];
}

// ─── Our shapes ───────────────────────────────────────────────────────────────

export interface TranslationRow {
  id: number;
  code: string;
  name: string;
  abbreviation: string;
  language: string;
  copyright: string | null;
  year: number;
  lxxPsalms: boolean;
}

export interface BookRow {
  id: number;
  code: string;
  number: number;
  name: string;
  abbreviation: string;
  testament: BibleTestament;
  chapterCount: number;
}

export interface CatalogEntry {
  id: number;
  code: string;
  name: string;
  abbreviation: string;
  language: string;
  copyright: string | null;
  /**
   * Whether this Bible is covered by a license our app key has agreed to.
   * Only meaningful on an `all_available` listing, where unlicensed Bibles are
   * present but cannot actually be read — see `listCatalog`.
   */
  licensed: boolean;
}

export interface LicenseRow {
  id: string;
  name: string;
  organization: string | null;
  /** Every Bible ID this single license covers. */
  bibleIds: number[];
}

// ─── HTTP ─────────────────────────────────────────────────────────────────────

/**
 * Single fetch helper. Returns parsed JSON on 2xx, `null` on any failure
 * (missing key, network error, timeout, non-2xx, bad JSON).
 *
 * Failures are silent by design: with no D1 fallback, the route layer turns a
 * `null` into a 404/503 and the UI shows its "temporarily unavailable" state
 * rather than a stack trace.
 */
async function yvFetch<T>(env: Bindings, path: string, params?: Record<string, string | string[]>): Promise<T | null> {
  const apiKey = env.YOUVERSION_API_KEY;
  if (!apiKey) return null;

  const url = new URL(`${YV_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (Array.isArray(v)) for (const item of v) url.searchParams.append(k, item);
      else url.searchParams.set(k, v);
    }
  }

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'X-YVP-App-Key': apiKey, Accept: 'application/json' },
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

export function isConfigured(env: Bindings): boolean {
  return !!env.YOUVERSION_API_KEY;
}

// ─── Mapping ──────────────────────────────────────────────────────────────────

/**
 * URL slug for a translation, e.g. `delut`, `nrt`.
 *
 * Uses the non-localized `abbreviation`, which is Latin script — the localized
 * one can be Cyrillic ('НРП') or another script and would sanitise away to
 * nothing. Falls back to `yv-{id}`. Callers must also accept the raw numeric ID
 * so links survive an abbreviation change on YouVersion's side.
 */
export function slugFor(b: { id: number; abbreviation: string; localized_abbreviation?: string | null }): string {
  const raw = (b.abbreviation || b.localized_abbreviation || '').trim().toLowerCase();
  const slug = raw.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || `yv-${b.id}`;
}

function catalogEntry(b: YvBible, licensed = true): CatalogEntry {
  return {
    id: b.id,
    code: slugFor(b),
    name: b.localized_title || b.title || String(b.id),
    abbreviation: b.localized_abbreviation || b.abbreviation || '',
    language: b.language_tag,
    copyright: b.copyright,
    licensed,
  };
}

/**
 * Detect Septuagint Psalm numbering from the books payload.
 *
 * Psalm 119 is the 176-verse acrostic in Hebrew numbering; in LXX numbering the
 * same psalm sits at 118. Verified across DELUT/ASV/NIV (Hebrew) and NRT/CARS
 * (LXX) on 2026-07-25. Detecting beats hardcoding IDs — it stays correct for
 * whatever translation an operator enables later.
 */
function detectLxxPsalms(books: YvBookMeta[]): boolean {
  const psalms = books.find((b) => b.id.toUpperCase() === 'PSA');
  const ch118 = psalms?.chapters?.find((c) => c.id === '118');
  return (ch118?.verses?.length ?? 0) === 176;
}

function mapBook(b: YvBookMeta, index: number): BookRow {
  // Chapter ids are numeric strings; intros and other apparatus are filtered out.
  const chapterCount = (b.chapters ?? []).filter((c) => /^\d+$/.test(c.id)).length;
  return {
    id: index + 1,
    code: b.id.toUpperCase(),
    number: index + 1,
    name: b.title,
    abbreviation: b.abbreviation,
    testament: b.canon === 'new_testament' ? 'NT' : 'OT',
    chapterCount,
  };
}

/**
 * Split a YouVersion HTML passage into verses.
 *
 * Content looks like:
 *   <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Text…
 *
 * `format=text` is not usable here — it drops verse boundaries entirely.
 */
export function parseHtmlPassage(html: string): { verse: number; text: string }[] {
  const marker = /<span class="yv-v" v="(\d+)"[^>]*><\/span>/g;
  const hits: { start: number; end: number; verse: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = marker.exec(html)) !== null) {
    hits.push({ start: m.index, end: m.index + m[0].length, verse: Number(m[1]) });
  }
  if (hits.length === 0) return [];

  const out = new Map<number, string>();
  for (let i = 0; i < hits.length; i++) {
    const slice = html
      .slice(hits[i].end, i + 1 < hits.length ? hits[i + 1].start : html.length)
      .replace(/<span class="yv-vlbl"[^>]*>[^<]*<\/span>/g, '')
      // Poetry lines are separate block elements; without this, the last word of
      // one line runs into the first word of the next ("мой;я ни в чем").
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/(p|div|li)>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    if (!slice) continue;
    // A verse can be split across several markers (poetry lines) — join them.
    const prev = out.get(hits[i].verse);
    out.set(hits[i].verse, prev ? `${prev} ${slice}` : slice);
  }
  return [...out.entries()].map(([verse, text]) => ({ verse, text })).sort((a, b) => a.verse - b.verse);
}

// ─── Public client ────────────────────────────────────────────────────────────

/**
 * Upper bound on the licensed-set crawl. 20 × 99 covers the entire platform
 * inventory, so the cap only ever trips if YouVersion grows well past its
 * current ~1,500 Bibles.
 */
const MAX_LICENSE_PAGES = 20;

/**
 * IDs of every Bible in `language` our app key may actually read.
 *
 * Crawls the default (licensed-only) listing to completion. Callers should cache
 * the result — it changes only when a license is accepted — since this is the
 * one expensive call in the module.
 *
 * All-or-nothing: any failed page returns `null` rather than the partial set.
 * A partial set is indistinguishable from a complete one to the caller, and
 * would be cached for a day — marking every Bible in the unfetched tail "not
 * licensed" and leaving the operator unable to enable a translation that is in
 * fact perfectly readable.
 *
 * Returns an array rather than a Set so the result is JSON-serialisable straight
 * into KV.
 */
export async function listLicensedIds(env: Bindings, language: string): Promise<number[] | null> {
  const ids: number[] = [];
  let token: string | undefined;

  for (let i = 0; i < MAX_LICENSE_PAGES; i++) {
    const params: Record<string, string | string[]> = {
      'language_ranges[]': [language],
      page_size: String(MAX_PAGE_SIZE),
    };
    if (token) params.page_token = token;

    const data = await yvFetch<YvBibleListResponse>(env, '/bibles', params);
    if (!data?.data) return null;
    for (const b of data.data) ids.push(b.id);
    if (!data.next_page_token) break;
    token = data.next_page_token;
  }
  return ids;
}

/**
 * One page of the YouVersion catalog. `language` is a 3-letter code (`deu`,
 * `eng`, `rus`) or `*`.
 *
 * Two YouVersion behaviours drive the shape of this function, and both silently
 * hide translations if you do not account for them:
 *
 *  1. `language_ranges[]` is **required** (HTTP 422 without it) and is
 *     *first-match-wins*, not a union — YouVersion returns Bibles "from the
 *     first language range which has available Bibles". Passing several ranges
 *     therefore yields only the first one that matches anything. We deliberately
 *     send exactly one range so that behaviour can never surprise a caller.
 *  2. `all_available` defaults to **false**, which returns only Bibles licensed
 *     to our app key rather than the full platform inventory. With
 *     `opts.allAvailable` we request everything and tag each entry with
 *     `licensed`, so the admin UI can show a translation that exists but is not
 *     yet usable — the usual reason a well-known version "is missing".
 *
 * `opts.licensedIds` supplies the licensed set from `listLicensedIds`. The
 * caller owns that crawl so it can be cached once per language instead of once
 * per catalog page. Omitting it on an `allAvailable` listing marks every row
 * licensed, which is the pre-existing behaviour.
 */
export async function listCatalog(
  env: Bindings,
  opts: {
    language?: string;
    pageSize?: number;
    pageToken?: string;
    allAvailable?: boolean;
    licensedIds?: number[];
  } = {},
): Promise<{ items: CatalogEntry[]; total: number; nextPageToken: string | null } | null> {
  const language = opts.language && opts.language !== 'all' ? opts.language : '*';
  const params: Record<string, string | string[]> = {
    'language_ranges[]': [language],
    page_size: String(Math.min(opts.pageSize ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE)),
  };
  if (opts.pageToken) params.page_token = opts.pageToken;
  if (opts.allAvailable) params.all_available = 'true';

  const data = await yvFetch<YvBibleListResponse>(env, '/bibles', params);
  if (!data?.data) return null;

  // Only an all_available listing can contain unlicensed rows; the default
  // listing is licensed by definition.
  const licensed = opts.allAvailable && opts.licensedIds ? new Set(opts.licensedIds) : null;

  return {
    items: data.data.map((b) => catalogEntry(b, licensed ? licensed.has(b.id) : true)),
    total: data.total_size ?? data.data.length,
    nextPageToken: data.next_page_token ?? null,
  };
}

/**
 * Licenses available to our app key, optionally narrowed to the one governing
 * `bibleId`. Reference data only — it says which publisher's terms govern which
 * Bibles, not whether we may read them.
 *
 * Whether a license has been *accepted* is deliberately not derived from here.
 * The rows carry `agreed_dt` and `yvp_user_id`, but under app-key auth both are
 * `null` on every row even when every license has been accepted in the developer
 * dashboard — they are user-scoped fields that only a "Sign in with YouVersion"
 * token would populate, and that flow is off-limits (docs/dsgvo.md). The
 * readable signal is `listLicensedIds`: a Bible on the default listing can be
 * read, one that is absent returns 403 on a passage fetch.
 */
export async function listLicenses(env: Bindings, bibleId?: number): Promise<LicenseRow[] | null> {
  const params: Record<string, string | string[]> = {};
  if (bibleId) params.bible_id = String(bibleId);

  const data = await yvFetch<YvLicenseListResponse>(env, '/licenses', params);
  if (!data?.data) return null;

  return data.data.map((l) => ({
    id: String(l.id),
    name: l.name,
    organization: typeof l.organization === 'string' ? l.organization : (l.organization?.name ?? null),
    bibleIds: l.bible_ids ?? [],
  }));
}

/** Metadata for a single Bible. Cheap — one request, no catalog crawl. */
export async function getBible(env: Bindings, id: number): Promise<CatalogEntry | null> {
  const b = await yvFetch<YvBible>(env, `/bibles/${id}`);
  return b?.id ? catalogEntry(b) : null;
}

/**
 * Books of a Bible, plus the LXX-Psalm flag (both come from the same payload).
 * The response is large (all chapters and verse ids), so callers should cache.
 */
export async function getBooks(env: Bindings, id: number): Promise<{ books: BookRow[]; lxxPsalms: boolean } | null> {
  const data = await yvFetch<{ data: YvBookMeta[] }>(env, `/bibles/${id}/books`);
  if (!data?.data?.length) return null;
  return { books: data.data.map(mapBook), lxxPsalms: detectLxxPsalms(data.data) };
}

/** Verses of one chapter. `bookCode` is a USFM code as returned by `getBooks`. */
export async function getChapterVerses(
  env: Bindings,
  id: number,
  bookCode: string,
  chapter: number,
): Promise<{ verse: number; text: string }[] | null> {
  const data = await yvFetch<YvPassage>(env, `/bibles/${id}/passages/${bookCode}.${chapter}`, { format: 'html' });
  if (!data?.content) return null;
  const verses = parseHtmlPassage(data.content);
  return verses.length > 0 ? verses : null;
}
