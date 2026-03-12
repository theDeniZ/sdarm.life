import { API, adminHeaders } from '../../lib/api';
import type { ImageDto, ListResponse } from '@sdarm/types';

const LIMIT = 24;

export async function fetchImages(page: number, unusedOnly?: boolean): Promise<ListResponse<ImageDto>> {
  const url = new URL(`${API}/api/v1/admin/images`);
  url.searchParams.set('limit',  String(LIMIT));
  url.searchParams.set('offset', String((page - 1) * LIMIT));
  if (unusedOnly) url.searchParams.set('unused', '1');
  const res = await fetch(url.toString(), { headers: adminHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as ListResponse<ImageDto>;
}

export async function uploadImage(file: File): Promise<{ key: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API}/api/v1/admin/images/upload`, {
    method:  'POST',
    headers: adminHeaders(),
    body:    form,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { key: string };
}

export async function deleteImage(key: string): Promise<void> {
  const res = await fetch(`${API}/api/v1/admin/images?key=${encodeURIComponent(key)}`, {
    method:  'DELETE',
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export { LIMIT };
