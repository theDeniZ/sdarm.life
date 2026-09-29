// Live content for the home grid's Bible, lesson and songbook cards.
//
// Server-only: every fetch runs in the page's server component, so a visitor's
// browser talks to none of these hosts. Each source is kept in memory per
// worker isolate for an hour (`remember`) — the home page is force-dynamic, and
// without it every visit would re-download a 200 KB lesson quarter. A miss is
// remembered for ten minutes, so a host that is down costs one slow request,
// not one per visit; every card has a fallback line when its data is missing.

import { hebrewToLxxPsalm } from '@sdarm/types';
import type { BibleTranslationDto, ListResponse, SongbookDto, SongListItemDto } from '@sdarm/types';
import { API, SBL_URL, SONGBOOK_URL, TREASURES_URL } from './api';

/** The lesson of the week containing "today" (Europe/Berlin). */
export interface LiveLesson {
  /** Lesson number within its quarter, e.g. 1. */
  no: number;
  title: string;
  /** First day of the lesson's week (its Sunday), YYYY-MM-DD. */
  from: string;
  /** The lesson's Sabbath, YYYY-MM-DD. */
  to: string;
  /** The week as the page's locale writes it, e.g. "27. Sept. – 3. Okt." — formatted
   *  here on the server so the client never re-formats it differently. */
  range: string;
  /** The quarter's title, e.g. "Mit Jesus wandeln". */
  quarterTitle: string | null;
}

/** The Psalm of the day and how many translations the reader offers. */
export interface LiveBible {
  /** Psalm number, Hebrew (Luther/KJV) numbering. */
  psalm: number;
  /** The reader, opened at that Psalm when a translation is available. */
  href: string;
  translations: number;
}

/** The song of the week and the size of the songbook collection. */
export interface LiveSongs {
  song: { number: number; title: string; href: string } | null;
  totalSongs: number;
  songbooks: number;
}

export interface HomeLive {
  /** "Today" the picks were made for, YYYY-MM-DD in Europe/Berlin. */
  today: string;
  lesson: LiveLesson | null;
  bible: LiveBible;
  songs: LiveSongs | null;
}

const HOUR_MS = 3_600_000;
const MISS_MS = 600_000;

/* Where a lesson quarter comes from, in the lesson page's own order
   (apps/sbl/upstream/index.html, loadQuarter): our mirror on the lesson site,
   then the publisher, then the channel where quarters appear before they are
   published. At the turn of a quarter only the last one has the new lessons. */
const PUBLISHER_SBL_DATA = 'https://app.sdarm.org/sbl/data/';
const ALPHA_SBL_DATA = 'https://sbl.thedeniz.dev/sbl/data/';

const memory = new Map<string, { at: number; value: unknown }>();

/** Keep a result for `ttl`, a miss (null) for MISS_MS. */
async function remember<T>(key: string, ttl: number, load: () => Promise<T | null>): Promise<T | null> {
  const hit = memory.get(key);
  if (hit && Date.now() - hit.at < (hit.value === null ? MISS_MS : ttl)) return hit.value as T | null;
  const value = await load();
  memory.set(key, { at: Date.now(), value });
  return value;
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json', 'User-Agent': 'sdarm.life (home grid)' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Today's date in Europe/Berlin as YYYY-MM-DD. `override` (the page's
 * ?screenshotDate=) pins it for screenshot tests; anything malformed is ignored.
 */
export function berlinToday(override?: string | null): string {
  if (override && /^\d{4}-\d{2}-\d{2}$/.test(override) && !Number.isNaN(Date.parse(override))) return override;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date());
}

/** Whole days since 1970-01-01 for a YYYY-MM-DD date — a stable day counter. */
function dayNumber(ymd: string): number {
  return Math.floor(Date.parse(`${ymd}T00:00:00Z`) / 86_400_000);
}

/* ── Sabbath School lesson ─────────────────────────────────────────────── */

interface QuarterJson {
  title?: string;
  lessons?: { no?: string | number; date?: string; title?: string; dailyLessons?: { date?: string }[] }[];
}

const toIso = (d: string) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;

async function loadQuarter(lang: string, year: number, quarter: number): Promise<QuarterJson | null> {
  const name = `${lang}/${lang}-${year}-${quarter}.json`;
  return remember(`sbl:${name}`, HOUR_MS, async () => {
    for (const base of [`${SBL_URL.replace(/\/$/, '')}/data/`, PUBLISHER_SBL_DATA, ALPHA_SBL_DATA]) {
      const q = await getJson<QuarterJson>(base + name);
      if (q?.lessons?.length) return q;
    }
    return null;
  });
}

/**
 * The lesson whose week (its first daily lesson through its Sabbath) contains
 * `today` — the same rule the lesson page uses to open on the current week.
 * Around the turn of a quarter that week belongs to the next or the previous
 * quarter, so one neighbour is asked: the next when today is past the current
 * quarter's last Sabbath (or the current quarter cannot be had), else the
 * previous.
 */
export async function currentLesson(locale: string, today: string): Promise<LiveLesson | null> {
  const lang = locale === 'en' ? 'en' : 'de';
  const ymd = today.replace(/-/g, '');
  const year = Number(today.slice(0, 4));
  const q = Math.floor((Number(today.slice(5, 7)) - 1) / 3) + 1;
  const next: [number, number] = q === 4 ? [year + 1, 1] : [year, q + 1];
  const prev: [number, number] = q === 1 ? [year - 1, 4] : [year, q - 1];

  const find = (data: QuarterJson | null): LiveLesson | null => {
    for (const les of data?.lessons ?? []) {
      if (!les.date || !les.title) continue;
      const start = les.dailyLessons?.[0]?.date ?? les.date;
      if (ymd >= start && ymd <= les.date) {
        const from = toIso(start);
        const to = toIso(les.date);
        return {
          no: Number(les.no) || 0,
          title: les.title.trim(),
          from,
          to,
          range: new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', timeZone: 'UTC' }).formatRange(
            new Date(`${from}T00:00:00Z`),
            new Date(`${to}T00:00:00Z`)
          ),
          quarterTitle: data?.title?.trim() || null,
        };
      }
    }
    return null;
  };

  const current = await loadQuarter(lang, year, q);
  const found = find(current);
  if (found) return found;
  const last = current?.lessons?.at(-1)?.date;
  const [y, n] = !current || (last && ymd > last) ? next : prev;
  return find(await loadQuarter(lang, y, n));
}

/* ── Bible ─────────────────────────────────────────────────────────────── */

/**
 * A Psalm a day, through all 150 in order and round again — the same Psalm
 * for everyone on a given day. It links to the reader in the first translation
 * of the page's language (else the first one enabled), mapped to that
 * translation's numbering; with none enabled, to the reader's start page.
 */
export async function bibleOfTheDay(locale: string, today: string): Promise<LiveBible> {
  const psalm = (((dayNumber(today) % 150) + 150) % 150) + 1;
  const list = await remember('bible:translations', HOUR_MS, () =>
    getJson<ListResponse<BibleTranslationDto>>(`${API}/bible/translations`)
  );
  const items = list?.items ?? [];
  const tr = items.find((t) => t.language === locale) ?? items[0];
  const href = tr
    ? `${TREASURES_URL}/${locale}/bible/${tr.code}/PSA/${tr.lxxPsalms ? hebrewToLxxPsalm(psalm) : psalm}`
    : `${TREASURES_URL}/${locale}/bible`;
  return { psalm, href, translations: items.length };
}

/* ── Songbook ──────────────────────────────────────────────────────────── */

/** ISO-8601 week number and its year, for a YYYY-MM-DD date. */
function isoWeek(ymd: string): { year: number; week: number } {
  const d = new Date(`${ymd}T00:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return { year: d.getUTCFullYear(), week: Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7) };
}

/**
 * The song of the week: one song from the songbook in the page's language
 * (else the largest), the same for the whole ISO week. Consecutive weeks step
 * through the book by a prime stride (211), so they land far apart rather than
 * on neighbouring numbers. Plus the totals across all songbooks.
 */
export async function songOfTheWeek(locale: string, today: string): Promise<LiveSongs | null> {
  const books = await remember('songbooks', HOUR_MS, () => getJson<SongbookDto[]>(`${API}/songbooks`));
  if (!books?.length) return null;

  const totalSongs = books.reduce((n, b) => n + (b.songCount || 0), 0);
  const withSongs = books.filter((b) => b.songCount > 0);
  const book =
    withSongs.find((b) => b.language === locale) ?? [...withSongs].sort((a, b) => b.songCount - a.songCount)[0];

  let song: LiveSongs['song'] = null;
  if (book) {
    const { year, week } = isoWeek(today);
    const offset = ((year * 53 + week) * 211) % book.songCount;
    const page = await remember(`songs:${book.slug}:${offset}`, HOUR_MS, () =>
      getJson<ListResponse<SongListItemDto>>(`${API}/songbooks/${book.slug}/songs?limit=1&offset=${offset}`)
    );
    const item = page?.items?.[0];
    if (item) {
      song = {
        number: item.number,
        title: item.title,
        href: `${SONGBOOK_URL}/${locale}/songbooks/${book.slug}/${item.id}`,
      };
    }
  }

  return { song, totalSongs, songbooks: books.length };
}

/** Everything the live cards need, fetched in parallel. */
export async function fetchHomeLive(locale: string, dateOverride?: string | null): Promise<HomeLive> {
  const today = berlinToday(dateOverride);
  const [lesson, bible, songs] = await Promise.all([
    currentLesson(locale, today),
    bibleOfTheDay(locale, today),
    songOfTheWeek(locale, today),
  ]);
  return { today, lesson, bible, songs };
}
