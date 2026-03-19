import type { SongbookDto, SongListItemDto, SongDto, ListResponse } from '@sdarm/types';

export const API = process.env.API_URL ?? 'https://api.sdarm.life/api/v1';
export const R2 = process.env.R2_URL ?? 'https://images.sdarm.life';

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

export async function fetchSongbooks(): Promise<SongbookDto[]> {
  try {
    const res = await fetch(`${API}/songbooks`, { cache: 'no-store' });
    if (!res.ok) return [];
    // The API returns a plain array (not { items, total }) for this endpoint
    return (await res.json()) as SongbookDto[];
  } catch {
    return [];
  }
}

export async function fetchSongbook(slug: string): Promise<SongbookDto | null> {
  try {
    const res = await fetch(`${API}/songbooks/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as SongbookDto;
  } catch {
    return null;
  }
}

export async function fetchSongs(
  slug: string,
  opts: { q?: string; limit?: number; offset?: number },
  baseUrl?: string
): Promise<ListResponse<SongListItemDto>> {
  const api = baseUrl ?? API;
  try {
    const params = new URLSearchParams();
    if (opts.q) params.set('q', opts.q);
    if (opts.limit != null) params.set('limit', String(opts.limit));
    if (opts.offset != null) params.set('offset', String(opts.offset));
    const res = await fetch(`${api}/songbooks/${slug}/songs?${params}`, { cache: 'no-store' });
    if (!res.ok) return { items: [], total: 0 };
    return (await res.json()) as ListResponse<SongListItemDto>;
  } catch {
    return { items: [], total: 0 };
  }
}

export async function fetchSong(id: string, baseUrl?: string): Promise<SongDto | null> {
  const api = baseUrl ?? API;
  try {
    const res = await fetch(`${api}/songs/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as SongDto;
  } catch {
    return null;
  }
}
