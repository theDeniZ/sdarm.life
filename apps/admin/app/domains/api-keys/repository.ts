import { API, adminHeaders } from '../../lib/api';
import type { ApiKey } from './types';

export async function fetchApiKeys(): Promise<ApiKey[]> {
  const res = await fetch(`${API}/api/v1/admin/api-keys`, { headers: adminHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as ApiKey[];
}

export async function createApiKey(name: string): Promise<{ key: string; apiKey: ApiKey }> {
  const res = await fetch(`${API}/api/v1/admin/api-keys`, {
    method: 'POST',
    headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { key: string; apiKey: ApiKey };
}

export async function revokeApiKey(id: string): Promise<void> {
  const res = await fetch(`${API}/api/v1/admin/api-keys/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
