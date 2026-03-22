import { API, adminHeaders } from '../../lib/api';
import type { TreasureDto, ListResponse } from '@sdarm/types';
import type { TreasureListItem, TreasureFormData } from './types';

export const LIMIT = 20;

export async function fetchTreasures(page: number): Promise<ListResponse<TreasureListItem>> {
  const offset = (page - 1) * LIMIT;
  const res = await fetch(`${API}/api/v1/admin/treasures?limit=${LIMIT}&offset=${offset}&_t=${Date.now()}`, {
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as ListResponse<TreasureListItem>;
}

export async function swapSortOrder(a: { id: number; sortOrder: number }, b: { id: number; sortOrder: number }): Promise<void> {
  await Promise.all([
    fetch(`${API}/api/v1/admin/treasures/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminHeaders() },
      body: JSON.stringify({ sortOrder: b.sortOrder }),
    }),
    fetch(`${API}/api/v1/admin/treasures/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminHeaders() },
      body: JSON.stringify({ sortOrder: a.sortOrder }),
    }),
  ]);
}

export async function swapWithSortOrder(a: { id: number; sortOrder: number }, targetSortOrder: number): Promise<void> {
  const res = await fetch(`${API}/api/v1/admin/treasures?limit=500&_t=${Date.now()}`, { headers: adminHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const all = ((await res.json()) as ListResponse<TreasureListItem>).items;
  const b = all.find((t) => t.sortOrder === targetSortOrder);
  if (!b) throw new Error(`No treasure with sort order ${targetSortOrder}`);
  await swapSortOrder(a, b);
}

export async function fetchTreasure(id: number): Promise<TreasureDto> {
  const res = await fetch(`${API}/api/v1/treasures/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as TreasureDto;
}

export async function createTreasure(data: TreasureFormData): Promise<TreasureDto> {
  const res = await fetch(`${API}/api/v1/admin/treasures`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify({
      ...data,
      author: data.author || null,
      description: data.description || null,
      coverGradient: data.coverGradient || null,
      coverAccentColor: data.coverAccentColor || null,
      price: data.price || null,
      epubUrl: data.epubUrl || null,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as TreasureDto;
}

export async function updateTreasure(id: number, data: Partial<TreasureFormData>): Promise<TreasureDto> {
  const res = await fetch(`${API}/api/v1/admin/treasures/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify({
      ...data,
      author: data.author !== undefined ? data.author || null : undefined,
      description: data.description !== undefined ? data.description || null : undefined,
      coverGradient: data.coverGradient !== undefined ? data.coverGradient || null : undefined,
      coverAccentColor: data.coverAccentColor !== undefined ? data.coverAccentColor || null : undefined,
      price: data.price !== undefined ? data.price || null : undefined,
      epubUrl: data.epubUrl !== undefined ? data.epubUrl || null : undefined,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as TreasureDto;
}

export async function deleteTreasure(id: number): Promise<void> {
  const res = await fetch(`${API}/api/v1/admin/treasures/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
