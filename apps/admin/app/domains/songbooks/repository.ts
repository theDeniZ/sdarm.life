import { API, adminHeaders } from '../../lib/api';
import type { SongbookDto, SongListItemDto, SongDto, SongPartDto, SongSheetDto, ListResponse } from '@sdarm/types';
import type { SongbookFormData, SongFormData, PartFormData } from './types';

export const SONG_LIMIT = 20;

// ── Songbooks ──────────────────────────────────────────────────────────────

export async function fetchSongbooks(): Promise<SongbookDto[]> {
  const res = await fetch(`${API}/api/v1/songbooks`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as SongbookDto[];
}

export async function createSongbook(data: SongbookFormData): Promise<SongbookDto> {
  const res = await fetch(`${API}/api/v1/admin/songbooks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as SongbookDto;
}

export async function updateSongbook(id: number, data: Partial<SongbookFormData>): Promise<SongbookDto> {
  const res = await fetch(`${API}/api/v1/admin/songbooks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as SongbookDto;
}

export async function deleteSongbook(id: number): Promise<void> {
  const res = await fetch(`${API}/api/v1/admin/songbooks/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// ── Songs ──────────────────────────────────────────────────────────────────

export async function fetchSongs(slug: string, page: number, q?: string): Promise<ListResponse<SongListItemDto>> {
  const params = new URLSearchParams({ limit: String(SONG_LIMIT), offset: String((page - 1) * SONG_LIMIT) });
  if (q) params.set('q', q);
  const res = await fetch(`${API}/api/v1/songbooks/${slug}/songs?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as ListResponse<SongListItemDto>;
}

export async function fetchSong(id: number): Promise<SongDto> {
  const res = await fetch(`${API}/api/v1/admin/songs/${id}`, { headers: adminHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as SongDto;
}

export async function createSong(data: SongFormData & { songbookId: number }): Promise<SongDto> {
  const res = await fetch(`${API}/api/v1/admin/songs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as SongDto;
}

export async function updateSong(id: number, data: Partial<SongFormData>): Promise<SongDto> {
  const res = await fetch(`${API}/api/v1/admin/songs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as SongDto;
}

export async function deleteSong(id: number): Promise<void> {
  const res = await fetch(`${API}/api/v1/admin/songs/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// ── Parts ──────────────────────────────────────────────────────────────────

export async function createPart(songId: number, data: PartFormData): Promise<SongPartDto> {
  const res = await fetch(`${API}/api/v1/admin/songs/${songId}/parts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as SongPartDto;
}

export async function updatePart(songId: number, partId: number, data: Partial<PartFormData>): Promise<SongPartDto> {
  const res = await fetch(`${API}/api/v1/admin/songs/${songId}/parts/${partId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as SongPartDto;
}

export async function deletePart(songId: number, partId: number): Promise<void> {
  const res = await fetch(`${API}/api/v1/admin/songs/${songId}/parts/${partId}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// ── Sheets ─────────────────────────────────────────────────────────────────

export async function uploadSheet(songId: number, file: File): Promise<SongSheetDto> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API}/api/v1/admin/songs/${songId}/sheets/upload`, {
    method: 'POST',
    headers: adminHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as SongSheetDto;
}

export async function deleteSheet(songId: number, sheetId: number): Promise<void> {
  const res = await fetch(`${API}/api/v1/admin/songs/${songId}/sheets/${sheetId}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
