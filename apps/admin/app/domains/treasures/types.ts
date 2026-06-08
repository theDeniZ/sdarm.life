import type { TreasureDto, TreasureType } from '@sdarm/types';

export type TreasureListItem = Pick<
  TreasureDto,
  | 'id'
  | 'title'
  | 'author'
  | 'type'
  | 'language'
  | 'isFree'
  | 'price'
  | 'sortOrder'
  | 'epubUrl'
  | 'coverKey'
  | 'createdAt'
>;

export interface TreasureFormData {
  title: string;
  author: string;
  description: string;
  type: TreasureType;
  language: string;
  coverGradient: string;
  coverAccentColor: string;
  coverKey: string | null;
  isFree: boolean;
  price: string;
  sortOrder: number;
  epubUrl: string;
}
