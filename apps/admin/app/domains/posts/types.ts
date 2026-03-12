import type { PostDto } from '@sdarm/types';

export type PostListItem = Pick<
  PostDto,
  'id' | 'title' | 'slug' | 'author' | 'coverKey' | 'isFeatured' | 'videoUrl' | 'publishedAt' | 'deletedAt'
>;

export interface PostFormData {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  author: string;
  publishedAt: string;
  videoUrl: string;
  coverKey: string | null;
  coverAlt: string;
  thumbKey: string | null;
  isFeatured: boolean;
}
