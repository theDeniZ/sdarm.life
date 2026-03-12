import { API, adminHeaders } from '../../lib/api';
import type { ConfigDto } from '@sdarm/types';

export async function fetchConfig(): Promise<ConfigDto> {
  const res = await fetch(`${API}/api/v1/config`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as ConfigDto;
}

export async function saveConfigKey(key: string, value: string | null): Promise<void> {
  const res = await fetch(`${API}/api/v1/admin/config/${key}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body:    JSON.stringify({ value: value || null }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
