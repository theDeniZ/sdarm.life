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
  createdAt: string;
}

export type ConfigDto = Record<string, string | null>;

export interface ListResponse<T> {
  items: T[];
  total: number;
}
