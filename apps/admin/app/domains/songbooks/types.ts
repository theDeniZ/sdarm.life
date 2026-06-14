import type { SongbookDto, SongPartType, TranslationType } from '@sdarm/types';

export type SongbookFormData = Pick<
  SongbookDto,
  'title' | 'slug' | 'language' | 'description' | 'coverKey' | 'sortOrder'
>;

export interface SongFormData {
  number: number;
  title: string;
  author: string | null;
  copyright: string | null;
}

export interface PartFormData {
  type: SongPartType;
  label: string;
  sortOrder: number;
  lyrics: string;
  language?: string | null;
  translationType?: TranslationType | null;
}

export interface TranslationDraft {
  language: string;
  translationType: TranslationType;
  text: string;
}
