import type { BibleChapter, BibleLicense, BibleTranslation, ParallelChapter } from './bible';

/**
 * The model shared by the presenter console, its mirror and the display
 * window: what one projected slide contains and how it is laid out.
 *
 * The console builds slides from the verse text it fetched with
 * `use=projector` (so the API has already refused any translation whose
 * license keeps it off a shared screen) and sends them to the display window
 * over a BroadcastChannel. Both sides render the same `ProjectorSlide`, which
 * is how the mirror shows exactly what the room sees.
 */

export const PROJECTOR_CHANNEL = 'bible-projector';

/** Most translations on one slide — more is not legible from the back row. */
export const MAX_PROJECTOR_TRANSLATIONS = 4;

/**
 * Most verses shown at once. A longer passage is read verse by verse; with
 * four translations, four verses is already two screens.
 */
export const MAX_SLIDE_VERSES = 4;

/** Rows, columns, a 2×2 grid, or focus (the primary large, the others smaller). */
export type ProjectorLayout = 'rows' | 'columns' | 'grid' | 'focus';
export const PROJECTOR_LAYOUTS: ProjectorLayout[] = ['rows', 'columns', 'grid', 'focus'];

/** Violett (the default), Graphit, Tinte and Papier — see styles/bible-projector.css. */
export type ProjectorTheme = 'violet' | 'graphite' | 'ink' | 'paper';
export const PROJECTOR_THEMES: ProjectorTheme[] = ['violet', 'graphite', 'ink', 'paper'];
export const DEFAULT_PROJECTOR_THEME: ProjectorTheme = 'violet';

/** Theme ids before the neutral palettes, mapped to their nearest successor. */
const LEGACY_THEMES: Record<string, ProjectorTheme> = { museum: 'violet', warm: 'violet', light: 'paper' };

/**
 * A theme from storage or from another window, which may predate the current
 * palettes: old ids map to the nearest new one, anything else to the default.
 */
export function normalizeTheme(value: unknown): ProjectorTheme {
  if (typeof value !== 'string') return DEFAULT_PROJECTOR_THEME;
  if ((PROJECTOR_THEMES as string[]).includes(value)) return value as ProjectorTheme;
  return LEGACY_THEMES[value] ?? DEFAULT_PROJECTOR_THEME;
}

/** Manual A−/A+ correction applied on top of auto-fit. */
export const PROJECTOR_SCALES = [0.8, 0.9, 1, 1.1, 1.25] as const;
export type ProjectorScale = (typeof PROJECTOR_SCALES)[number];

/** Smallest verse size on the 1080p stage — ≈3 % of the screen height. */
export const MIN_TEXT_PX = 32;

/**
 * Below this size a slide is split across screens rather than set denser —
 * the design asks for at least 36 px in a service; only a slide already split
 * as far as allowed goes on down to `MIN_TEXT_PX`.
 */
export const SPLIT_BELOW_PX = 36;

/**
 * Most screens one slide is split across when it does not fit at the floor
 * size. The design says to split rather than shrink below 32 px; the longest
 * passage allowed (four long verses, e.g. Esther 8:6–9, in four translations)
 * needs about six, so eight leaves headroom and still bounds the measuring.
 */
export const MAX_SLIDE_PARTS = 8;

export interface SlideSide {
  code: string;
  /** The projector label (`projectorLabel`), not necessarily the API abbreviation. */
  abbreviation: string;
  name: string;
  /** BCP-47 short tag of the text, e.g. 'ru'. */
  language: string;
  /** The book's name in this translation's language. */
  bookName: string;
  /** Chapter read on this side — differs from the primary across LXX/Hebrew Psalms. */
  chapter: number;
  license: BibleLicense;
}

/** One chapter in 1–4 translations, aligned by verse number. */
export interface Passage {
  bookCode: string;
  /** Chapter in the primary translation's numbering. */
  chapter: number;
  sides: SlideSide[];
  verses: { verse: number; texts: (string | null)[] }[];
}

export interface SlideRow {
  verse: number;
  texts: (string | null)[];
  /** The text starts mid-verse — the rest of a verse split across screens. */
  continued?: boolean;
  /** The verse goes on on the next screen. */
  continues?: boolean;
}

/** What the room sees: the chosen verses of one passage. */
export interface Slide {
  bookCode: string;
  chapter: number;
  sides: SlideSide[];
  rows: SlideRow[];
}

export interface SlideOptions {
  /** Book name in every shown language in the title, or only the primary's. */
  allBookNames: boolean;
  /** Translation abbreviation + language beside every text. */
  labels: boolean;
}

/** Everything the display window renders. Sent whole, so a late-opened display catches up in one message. */
export interface HallState {
  slide: Slide | null;
  layout: ProjectorLayout;
  theme: ProjectorTheme;
  scale: ProjectorScale;
  options: SlideOptions;
  blank: boolean;
  frozen: boolean;
  /** Which screen of a slide that is split across several (0-based). */
  part: number;
}

/**
 * `bible-projector` channel protocol.
 *
 * display → console: `ready` when it loads or is asked (`hello`), `bye` when it closes.
 * console → display: `sync` with the whole hall state on every change, `hello`
 * when the console opens (so a display that outlived an earlier console
 * announces itself again), `requestFullscreen` for the tap-to-fullscreen overlay.
 */
export type ProjectorMessage =
  | { type: 'ready'; width: number; height: number }
  | { type: 'bye' }
  | { type: 'hello' }
  | { type: 'sync'; state: HallState }
  | { type: 'requestFullscreen' };

/**
 * How the projector and its console name a translation — the labels BibleShow
 * uses, which congregations already know from the screen. Keyed by
 * translation code; any other translation keeps the API's abbreviation. Only
 * the projector uses these: the reader, the parallel view and the license
 * register show the API abbreviations.
 */
const PROJECTOR_LABELS: Record<string, string> = {
  synodal: 'RST',
  schlachter1905: 'SCH',
  delut: 'LUT',
  luther1912: 'LUT',
  elberfelder1905: 'ELB',
  kjv: 'KJV',
  rv1909: 'RV',
};

export function projectorLabel(tr: { code: string; abbreviation: string }): string {
  return PROJECTOR_LABELS[tr.code] ?? tr.abbreviation;
}

export const DEFAULT_SLIDE_OPTIONS: SlideOptions = { allBookNames: true, labels: true };

/** The layout the design recommends for this many translations. */
export function recommendedLayout(count: number): ProjectorLayout {
  if (count === 2) return 'columns';
  if (count >= 4) return 'grid';
  return 'rows';
}

const MAX_TEXT_PX: Record<ProjectorLayout, [number, number, number, number]> = {
  rows: [84, 64, 48, 42],
  columns: [84, 58, 48, 38],
  grid: [84, 58, 48, 42],
  focus: [84, 66, 62, 56],
};

/** Secondary translations in the focus layout, relative to the primary. */
const FOCUS_RATIO = [1, 0.667, 0.6, 0.607];

/** Largest verse size for a layout before auto-fit starts stepping down. */
export function maxTextPx(layout: ProjectorLayout, count: number, scale: number): number {
  const n = Math.min(Math.max(count, 1), MAX_PROJECTOR_TRANSLATIONS);
  return Math.max(MIN_TEXT_PX, Math.round((MAX_TEXT_PX[layout][n - 1] * scale) / 2) * 2);
}

export function focusSecondaryPx(primaryPx: number, count: number): number {
  const n = Math.min(Math.max(count, 1), MAX_PROJECTOR_TRANSLATIONS);
  return Math.max(MIN_TEXT_PX, Math.round(primaryPx * FOCUS_RATIO[n - 1]));
}

/**
 * Where to cut `text` so that about `fraction` of it comes first: the word
 * boundary nearest that point, preferring one right after punctuation when
 * there is one close by, so a screen ends on a clause rather than mid-phrase.
 */
function cutIndex(text: string, fraction: number): number {
  if (fraction <= 0) return 0;
  if (fraction >= 1) return text.length;
  const target = text.length * fraction;
  const window = Math.max(12, text.length * 0.12);
  let best = -1;
  let bestScore = Infinity;
  for (const m of text.matchAll(/\s+/g)) {
    const at = m.index ?? 0;
    const distance = Math.abs(at - target);
    if (distance > window && best !== -1) continue;
    const punct = /[,;:.!?)»“"]$/.test(text.slice(0, at));
    const score = distance - (punct ? window * 0.6 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = at;
    }
  }
  return best === -1 ? text.length : best;
}

function sliceText(text: string | null, from: number, to: number): string | null {
  if (text === null) return null;
  return text.slice(cutIndex(text, from), cutIndex(text, to)).trim();
}

/**
 * Split a slide into `count` screens of about the same amount of text.
 *
 * Verses are weighed by the length of all their texts together, and the cuts
 * fall at equal shares of the total. A cut close to a verse boundary moves to
 * it, so a range breaks between verses when it can; otherwise every text of
 * that verse is cut at the same fraction, on a word boundary. Each screen
 * keeps every translation, so the room reads the same part in all languages.
 */
export function splitSlide(slide: Slide, count: number): Slide[] {
  if (count <= 1) return [slide];
  const weights = slide.rows.map((r) => r.texts.reduce((n, t) => n + (t?.length ?? 0), 0) || 1);
  const total = weights.reduce((a, b) => a + b, 0);
  // Every cut as (row, fraction of that row), snapped to a verse edge when near one.
  const cuts: { row: number; at: number }[] = [];
  for (let j = 1; j < count; j++) {
    let rest = (total * j) / count;
    let row = 0;
    while (row < weights.length - 1 && rest > weights[row]) rest -= weights[row++];
    let at = rest / weights[row];
    if (at < 0.15) at = 0;
    else if (at > 0.85) at = 1;
    cuts.push(at === 1 ? { row: row + 1, at: 0 } : { row, at });
  }
  const bounds = [{ row: 0, at: 0 }, ...cuts, { row: slide.rows.length, at: 0 }];
  const parts: Slide[] = [];
  for (let p = 0; p < count; p++) {
    const start = bounds[p];
    const end = bounds[p + 1];
    const rows: SlideRow[] = [];
    for (let r = start.row; r <= Math.min(end.row, slide.rows.length - 1); r++) {
      const from = r === start.row ? start.at : 0;
      const to = r === end.row ? end.at : 1;
      if (to <= from) continue;
      const row = slide.rows[r];
      rows.push({
        verse: row.verse,
        texts: row.texts.map((t) => sliceText(t, from, to)),
        continued: from > 0 || undefined,
        continues: to < 1 || undefined,
      });
    }
    if (rows.length > 0) parts.push({ ...slide, rows });
  }
  return parts;
}

/** '26', '26–27', '26, 28', '1–3, 5' */
export function formatVerseList(verses: number[]): string {
  const sorted = [...new Set(verses)].sort((a, b) => a - b);
  const parts: string[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    parts.push(j === i ? String(sorted[i]) : `${sorted[i]}–${sorted[j]}`);
    i = j + 1;
  }
  return parts.join(', ');
}

export function slideReference(slide: Pick<Slide, 'chapter' | 'rows'>): string {
  return `${slide.chapter}:${formatVerseList(slide.rows.map((r) => r.verse))}`;
}

/** Book names in translation order, each language once. */
export function titleBookNames(sides: SlideSide[], all: boolean): string[] {
  if (sides.length === 0) return [];
  if (!all) return [sides[0].bookName];
  return [...new Set(sides.map((s) => s.bookName))];
}

/** A slide of the chosen verses — never more than `MAX_SLIDE_VERSES`; a longer choice is refused. */
export function slideFromPassage(passage: Passage, verses: Iterable<number>): Slide | null {
  const wanted = new Set(verses);
  if (wanted.size > MAX_SLIDE_VERSES) return null;
  const rows = passage.verses.filter((v) => wanted.has(v.verse));
  if (rows.length === 0) return null;
  return { bookCode: passage.bookCode, chapter: passage.chapter, sides: passage.sides, rows };
}

/**
 * The verses from `anchor` towards `target` (both included, in chapter
 * order), stopping after `MAX_SLIDE_VERSES`. `capped` says the range was cut
 * short, so the console can say why the extension stopped.
 */
export function verseRange(available: number[], anchor: number, target: number): { verses: number[]; capped: boolean } {
  const lo = Math.min(anchor, target);
  const hi = Math.max(anchor, target);
  const span = available.filter((v) => v >= lo && v <= hi);
  if (span.length <= MAX_SLIDE_VERSES) return { verses: span, capped: false };
  const kept = target >= anchor ? span.slice(0, MAX_SLIDE_VERSES) : span.slice(-MAX_SLIDE_VERSES);
  return { verses: kept, capped: true };
}

/** Whether `verse` can join a range started at `anchor` without passing the cap. */
export function withinRangeCap(available: number[], anchor: number, verse: number): boolean {
  return verseRange(available, anchor, verse).capped === false;
}

/**
 * Keep one- and two-letter words on the line of the word that follows them
 * ("a", "în", "zu", "of"), so a line never ends on a dangling particle. Only
 * the space is swapped for a no-break space — the words are untouched.
 */
export function bindShortWords(text: string): string {
  return text.replace(/(?<=(?:^|[\s(„«“"])[\p{L}]{1,2}) /gu, ' ');
}

/**
 * Plain public domain: nothing beyond "public domain" has to be shown. Such
 * translations share one line on the slide; any other basis, or a notice the
 * license requires verbatim, gets its own line under its text.
 */
export function isPlainPublicDomain(license: BibleLicense): boolean {
  return license.basis === 'public-domain' && !license.notice;
}

/** The language named in the operator's UI language, e.g. 'Russisch'. */
export function languageName(tag: string, uiLocale: string): string {
  try {
    const name = new Intl.DisplayNames([uiLocale], { type: 'language' }).of(tag) ?? tag;
    return name.charAt(0).toLocaleUpperCase(uiLocale) + name.slice(1);
  } catch {
    return tag;
  }
}

export function passageFromChapter(ch: BibleChapter, translation: BibleTranslation): Passage {
  return {
    bookCode: ch.book.code,
    chapter: ch.chapter,
    sides: [
      {
        code: translation.code,
        abbreviation: projectorLabel(translation),
        name: translation.name,
        language: translation.language,
        bookName: ch.book.name,
        chapter: ch.chapter,
        license: ch.translation.license,
      },
    ],
    verses: ch.verses.map((v) => ({ verse: v.verse, texts: [v.text] })),
  };
}

export function passageFromParallel(p: ParallelChapter): Passage {
  return {
    bookCode: p.bookCode,
    chapter: p.translations[0]?.chapter ?? 1,
    sides: p.translations.map((t) => ({
      code: t.code,
      abbreviation: projectorLabel(t),
      name: t.name,
      language: t.language,
      bookName: t.bookName,
      chapter: t.chapter,
      license: t.license,
    })),
    verses: p.verses.map((v) => ({ verse: v.verse, texts: v.texts })),
  };
}
