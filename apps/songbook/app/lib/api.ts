import type { SongbookDto, SongListItemDto, SongDto, ListResponse } from '@sdarm/types';

export const API = process.env.API_URL ?? 'https://api.sdarm.life/api/v1';
export const R2 = process.env.R2_URL ?? 'https://images.sdarm.life';

export function r2url(key: string | null): string | null {
  return key ? `${R2}/${key}` : null;
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
  opts: { q?: string; limit?: number; offset?: number }
): Promise<ListResponse<SongListItemDto>> {
  try {
    const params = new URLSearchParams();
    if (opts.q) params.set('q', opts.q);
    if (opts.limit != null) params.set('limit', String(opts.limit));
    if (opts.offset != null) params.set('offset', String(opts.offset));
    const res = await fetch(`${API}/songbooks/${slug}/songs?${params}`, { cache: 'no-store' });
    if (!res.ok) return { items: [], total: 0 };
    return (await res.json()) as ListResponse<SongListItemDto>;
  } catch {
    return { items: [], total: 0 };
  }
}

export async function fetchSong(id: string): Promise<SongDto | null> {
  try {
    const res = await fetch(`${API}/songs/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as SongDto;
  } catch {
    return null;
  }
}
