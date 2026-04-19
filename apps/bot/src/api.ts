import type { ListResponse, SongbookDto, SongDto, SongListItemDto, SongSearchResultDto } from '@sdarm/types';

// API returns songbook detail with songCount at /songbooks/:slug
type SongbookDetailDto = SongbookDto & { songCount: number };

const DEFAULT_API_URL = 'https://api.sdarm.life/api/v1';

/** Lightweight fetch wrapper over the public sdarm.life API.
 *  The bot only ever makes GET requests — no write access to the database. */
export function createApiClient(baseUrl: string = DEFAULT_API_URL) {
  async function get<T>(path: string): Promise<T> {
    const url = `${baseUrl}${path}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      // 8 s timeout — generous enough for D1 cold starts, short enough to fail fast
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      throw new Error(`API responded with ${res.status} for ${path}`);
    }

    return (await res.json()) as T;
  }

  return {
    /** All songbooks ordered by sort_order. */
    getSongbooks(): Promise<SongbookDto[]> {
      return get<SongbookDto[]>('/songbooks');
    },

    /** Single songbook by slug — avoids fetching all books just to find one. */
    getSongbook(slug: string): Promise<SongbookDetailDto> {
      return get<SongbookDetailDto>(`/songbooks/${encodeURIComponent(slug)}`);
    },

    /** Paginated song list for a given songbook slug.
     *  Pass `q` to filter by number, title, or lyrics. */
    getSongs(slug: string, opts: { q?: string; limit?: number; offset?: number } = {}): Promise<ListResponse<SongListItemDto>> {
      const { q, limit = 15, offset = 0 } = opts;
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (q) params.set('q', q);
      return get<ListResponse<SongListItemDto>>(`/songbooks/${encodeURIComponent(slug)}/songs?${params}`);
    },

    /** Full song (title + all parts with lyrics). */
    getSong(id: number): Promise<SongDto> {
      return get<SongDto>(`/songs/${id}`);
    },

    /** Global search — searches title, number, and lyrics across ALL songbooks. */
    searchSongs(q: string, opts: { limit?: number; offset?: number } = {}): Promise<ListResponse<SongSearchResultDto>> {
      const { limit = 20, offset = 0 } = opts;
      const params = new URLSearchParams({ q, limit: String(limit), offset: String(offset) });
      return get<ListResponse<SongSearchResultDto>>(`/songs/search?${params}`);
    },

    /** Most recently added songs across all songbooks (DESC by created_at). */
    getRecentSongs(limit: number = 20): Promise<unknown> {
      return get<unknown>(`/songs/recent?limit=${limit}`);
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
