export interface PostDto {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  author: string | null;
  videoUrl: string | null;
  coverKey: string | null;
  coverAlt: string | null;
  thumbKey: string | null;
  isFeatured: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ImageDto {
  key: string;
  size: number;
  uploaded: string;
  usedIn: { type: string; label: string }[];
}

export interface SubscriberDto {
  id: number;
  email: string;
  language: string;
  confirmedAt: string | null;
  createdAt: string;
}

export type ConfigDto = Record<string, string | null>;

export interface ListResponse<T> {
  items: T[];
  total: number;
}

export interface SongbookDto {
  id: number;
  title: string;
  slug: string;
  language: string;
  description: string | null;
  coverKey: string | null;
  sortOrder: number;
  songCount: number;
}

export interface SongListItemDto {
  id: number;
  number: number;
  title: string;
  author: string | null;
  copyright: string | null;
  matchType?: 'title' | 'number' | 'lyrics' | null;
}

export type SongPartType = 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'coda';
export type SongSheetType = 'pdf' | 'image';

export interface SongPartDto {
  id: number;
  type: SongPartType;
  label: string;
  sortOrder: number;
  lyrics: string;
}

export interface SongSheetDto {
  id: number;
  key: string;
  type: SongSheetType;
  sortOrder: number;
}

export interface SongDto {
  id: number;
  number: number;
  title: string;
  author: string | null;
  copyright: string | null;
  songbook: { id: number; title: string; slug: string; language: string };
  parts: SongPartDto[];
  sheets: SongSheetDto[];
  createdAt: string;
  updatedAt: string;
}

export interface SongSearchResultDto {
  id: number;
  number: number;
  title: string;
  author: string | null;
  songbook: { id: number; title: string; slug: string };
}

export type TreasureType = 'book';

export interface TreasureDto {
  id: number;
  title: string;
  author: string | null;
  description: string | null;
  type: TreasureType;
  language: string;
  coverGradient: string | null;
  coverAccentColor: string | null;
  coverKey: string | null;
  isFree: boolean;
  price: string | null;
  sortOrder: number;
  epubUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Bible ─────────────────────────────────────────────────────────────────────
//
// Bible content comes from the YouVersion Platform API, proxied server-side by
// `apps/api` (the API key never reaches the browser). Nothing is stored in D1 —
// the only persisted state is the admin-curated list of enabled YouVersion
// Bible IDs in Workers KV (config key `bible_translations`).

export interface BibleTranslationDto {
  /** YouVersion Bible ID — the identifier used against the Platform API. */
  id: number;
  /** URL slug used in /bible/{code}/… — lowercased abbreviation, or `yv-{id}`. */
  code: string;
  /** Localized title, e.g. 'Lutherbibel 1912'. */
  name: string;
  /** Localized abbreviation, e.g. 'DELUT'. */
  abbreviation: string;
  /** BCP-47 short tag, e.g. 'de'. */
  language: string;
  /** Publisher copyright notice — render it wherever the text is shown. */
  copyright: string | null;
  /** Best-effort publication year parsed from the title; 0 when unknown. */
  year: number;
  /** True when the translation uses Septuagint Psalm numbering (see psalms.ts). */
  lxxPsalms: boolean;
}

export type BibleTestament = 'OT' | 'NT';

export interface BibleBookDto {
  id: number;
  /** USFM code as used by YouVersion: 'GEN', 'JHN', 'REV'. */
  code: string;
  number: number; // 1..66
  name: string; // localized to the translation's language
  abbreviation: string;
  testament: BibleTestament;
  chapterCount: number;
}

export interface BibleVerseDto {
  verse: number;
  text: string;
}

export interface BibleChapterDto {
  translation: { code: string; name: string; copyright: string | null };
  book: BibleBookDto;
  chapter: number;
  verses: BibleVerseDto[];
}

export interface ParallelVerseDto {
  verse: number;
  a: string | null; // null when this side has no verse N
  b: string | null;
}

export interface ParallelChapterDto {
  bookCode: string;
  a: { code: string; name: string; chapter: number; copyright: string | null };
  b: { code: string; name: string; chapter: number; copyright: string | null };
  verses: ParallelVerseDto[];
}

export * from './psalms';
