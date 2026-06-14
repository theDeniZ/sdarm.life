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
export type TranslationType = 'original' | 'singable' | 'reference';

export interface SongPartDto {
  id: number;
  type: SongPartType;
  label: string;
  sortOrder: number;
  lyrics: string;
  language: string | null;
  translationType: TranslationType | null;
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
