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
  songbook: { id: number; title: string; slug: string };
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

export type TreasureType = 'book' | 'bible';

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
  bibleCode?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Bible ─────────────────────────────────────────────────────────────────────

export interface BibleTranslationDto {
  id: number;
  code: string; // 'synodal', 'luther1912', 'kjv'
  name: string; // from treasures.title — e.g. 'King James Version'
  language: string; // 'ru', 'de', 'en'
  year: number;
  copyright: string | null;
  license: string; // 'public-domain', 'CC-BY-4.0', etc.
  treasureId: number;
  description: string | null;
  coverGradient: string | null;
  coverAccentColor: string | null;
  coverKey: string | null;
}

export type BibleTestament = 'OT' | 'NT';

export interface BibleBookDto {
  id: number;
  code: string; // USFM 3-letter (eBible variant): 'GEN', 'JOH', 'REV'
  number: number; // 1..66
  name: string; // localized to translation language
  abbreviation: string;
  testament: BibleTestament;
  chapterCount: number;
}

export interface BibleVerseDto {
  verse: number;
  text: string;
}

export interface BibleChapterDto {
  translation: { code: string; name: string };
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
  a: { code: string; name: string; chapter: number };
  b: { code: string; name: string; chapter: number };
  verses: ParallelVerseDto[];
}

export * from './psalms';
