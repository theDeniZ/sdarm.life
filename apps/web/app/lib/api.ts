import type { PostDto, ConfigDto, ListResponse, TreasureDto, SongbookDto } from '@sdarm/types';
import { formatDate } from './format';
import type { HeroPost } from '../components/HeroSection';
import type { NewsPost } from '../components/NewsSection';
import type { FooterConfig } from '../components/Footer';

export const API = process.env.API_URL ?? 'https://api.sdarm.life/api/v1';
export const R2 = process.env.R2_URL ?? 'https://images.sdarm.life';
export const FALLBACK_IMG = 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=85&fit=crop';

export interface ImageTransform {
  w?: number;
  h?: number;
  q?: number;
}

const TRANSFORMS_ENABLED = process.env.R2_TRANSFORMS !== 'false';

export function r2url(key: string | null, opts?: ImageTransform): string | null {
  if (!key) return null;
  const base = `${R2}/${key}`;
  if (!opts || !TRANSFORMS_ENABLED || R2.includes('localhost')) return base;
  const params = [opts.w && `w=${opts.w}`, opts.h && `h=${opts.h}`, `f=auto`, `q=${opts.q ?? 80}`]
    .filter(Boolean)
    .join(',');
  return `${R2}/cdn-cgi/image/${params}/${key}`;
}

export async function fetchPosts(params: string): Promise<PostDto[] | null> {
  try {
    const res = await fetch(`${API}/posts?${params}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return ((await res.json()) as ListResponse<PostDto>).items;
  } catch {
    return null;
  }
}

export async function fetchPost(slug: string): Promise<PostDto | null> {
  try {
    const res = await fetch(`${API}/posts/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as PostDto;
  } catch {
    return null;
  }
}

export async function fetchConfig(): Promise<ConfigDto | null> {
  try {
    const res = await fetch(`${API}/config`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as ConfigDto;
  } catch {
    return null;
  }
}

export function toHeroPost(post: PostDto): HeroPost {
  return {
    title: post.title,
    meta: `${formatDate(post.publishedAt)}${post.author ? ` · ${post.author}` : ''}`,
    excerpt: post.excerpt ?? '',
    body: post.body ?? '',
    imageUrl: r2url(post.coverKey, { w: 1200, q: 85 }) ?? FALLBACK_IMG,
    thumbUrl: r2url(post.thumbKey, { w: 300, h: 200 }) ?? r2url(post.coverKey, { w: 300, h: 200 }) ?? FALLBACK_IMG,
    imageAlt: post.coverAlt ?? post.title,
    slug: post.slug,
  };
}

export function toNewsPost(post: PostDto): NewsPost {
  return {
    id: String(post.id),
    title: post.title,
    date: formatDate(post.publishedAt),
    author: post.author ?? '',
    body: post.excerpt ?? post.body ?? '',
    imageUrl: r2url(post.coverKey, { w: 600, h: 400 }) ?? FALLBACK_IMG,
    imageAlt: post.coverAlt ?? post.title,
    href: `/posts/${post.slug}`,
  };
}

export interface NewsData {
  book: { title: string; author: string | null; href: string } | null;
  song: { title: string; songCount: number; href: string } | null;
  sermon: { title: string; author: string | null; date: string; href: string } | null;
  study: { title: string; href: string } | null;
  eventsUrl: string;
}

export async function fetchTreasures(params: string): Promise<TreasureDto[] | null> {
  try {
    const res = await fetch(`${API}/treasures?${params}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return ((await res.json()) as ListResponse<TreasureDto>).items;
  } catch {
    return null;
  }
}

export async function fetchSongbooks(): Promise<SongbookDto[] | null> {
  try {
    const res = await fetch(`${API}/songbooks`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as SongbookDto[];
  } catch {
    return null;
  }
}

export function toFooterConfig(config: ConfigDto): FooterConfig {
  return {
    donation_url: config.donation_url ?? undefined,
    facebook_url: config.facebook_url ?? undefined,
    whatsapp_url: config.whatsapp_url ?? undefined,
    instagram_url: config.instagram_url ?? undefined,
    youtube_url: config.youtube_url ?? undefined,
  };
}
