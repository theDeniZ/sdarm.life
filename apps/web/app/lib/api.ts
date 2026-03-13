import type { PostDto, ConfigDto, ListResponse } from '@sdarm/types';
import { formatDate } from './format';
import type { HeroPost } from '../components/HeroSection';
import type { NewsPost } from '../components/NewsSection';
import type { FooterConfig } from '../components/Footer';

export const API = process.env.API_URL ?? 'https://api.sdarm.life/api/v1';
export const R2 = process.env.R2_URL ?? 'https://images.sdarm.life';
export const SONGBOOK_URL = process.env.SONGBOOK_URL ?? 'https://songs.sdarm.life';
export const FALLBACK_IMG = 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=85&fit=crop';

export function r2url(key: string | null): string | null {
  return key ? `${R2}/${key}` : null;
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
    imageUrl: r2url(post.coverKey) ?? FALLBACK_IMG,
    thumbUrl: r2url(post.thumbKey) ?? r2url(post.coverKey) ?? FALLBACK_IMG,
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
    imageUrl: r2url(post.coverKey) ?? FALLBACK_IMG,
    imageAlt: post.coverAlt ?? post.title,
    href: `/posts/${post.slug}`,
  };
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
