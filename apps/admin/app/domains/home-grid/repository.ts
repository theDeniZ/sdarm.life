import { API, adminHeaders } from '../../lib/api';
import type { ConfigDto, HomeGridConfig } from '@sdarm/types';

/**
 * The grid lives in the same KV config document as every other setting, under
 * the single key `home_grid`, as a JSON string. It is the one key that holds a
 * document rather than a scalar — five blocks with a dozen settings each in two
 * languages is about a hundred values, well past what flat keys can carry.
 */
export const HOME_GRID_KEY = 'home_grid';

export async function fetchGridConfigRaw(): Promise<string | null> {
  const res = await fetch(`${API}/api/v1/config?_t=${Date.now()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const config = (await res.json()) as ConfigDto;
  return config[HOME_GRID_KEY] ?? null;
}

export async function saveGridConfig(config: HomeGridConfig): Promise<void> {
  const res = await fetch(`${API}/api/v1/admin/config/${HOME_GRID_KEY}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify({ value: JSON.stringify(config) }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

/** Upload a file and return its R2 key. Same endpoint the image library uses. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API}/api/v1/admin/images/upload`, {
    method: 'POST',
    headers: adminHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return ((await res.json()) as { key: string }).key;
}
