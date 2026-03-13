import type { SongbookDto, SongPartType } from '@sdarm/types';

export type SongbookFormData = Pick<
  SongbookDto,
  'title' | 'slug' | 'language' | 'description' | 'coverKey' | 'sortOrder'
>;

export interface SongFormData {
  number: number;
  title: string;
  author: string;
  copyright: string;
}

export interface PartFormData {
  type: SongPartType;
  label: string;
  sortOrder: number;
  lyrics: string;
}
