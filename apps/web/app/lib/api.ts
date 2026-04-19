import type { PostDto, ConfigDto, ListResponse, TreasureDto, SongbookDto } from '@sdarm/types';

export const API = process.env.API_URL ?? 'https://api.sdarm.life/api/v1';
export const R2 = process.env.R2_URL ?? 'https://images.sdarm.life';
export const WEB_URL = process.env.WEB_URL ?? 'https://sdarm.life';
export const TREASURES_URL = process.env.TREASURES_URL ?? 'https://treasures.sdarm.life';
export const SONGBOOK_URL = process.env.SONGBOOK_URL ?? 'https://songs.sdarm.life';
export const EVENTS_URL = process.env.EVENTS_URL ?? 'https://events.sdarm.life';
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

// Releases section data — only what needs API. Faith / Quote / YouVersion /
// Event cards are static and don't need any data injection.
export interface NewsData {
  book: { title: string; author: string | null; href: string } | null;
  song: { title: string; songCount: number; href: string } | null;
  eventsUrl: string;
  aboutUrl: string;
  youVersionUrl: string;
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
