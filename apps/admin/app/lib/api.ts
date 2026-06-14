// Client: empty string = same-origin proxy at /api/v1/* (hides API_KEY from browser).
// Server: must be absolute — Node.js fetch doesn't resolve relative URLs. Defaults to localhost for dev.
export const API =
  typeof window === 'undefined' ? process.env.API_URL || `http://localhost:${process.env.PORT ?? 3001}` : '';
export const R2 = process.env.NEXT_PUBLIC_R2_URL ?? 'https://images.sdarm.life';

export function adminHeaders(): HeadersInit {
  // Authorization is added by the server-side proxy — do not include it here.
  return {};
}

export function r2url(key: string | null): string | null {
  return key ? `${R2}/${key}` : null;
}

// Aggregate views (dashboard, statistics) need the full dataset, not one
// paginated page. Pages through a list endpoint until `total` is reached so
// counts stay accurate regardless of how many rows exist.
export async function fetchAll<T>(path: string): Promise<{ items: T[]; total: number }> {
  const pageSize = 500;
  const items: T[] = [];
  const sep = path.includes('?') ? '&' : '?';
  let offset = 0;
  while (true) {
    const res = await fetch(`${API}${path}${sep}limit=${pageSize}&offset=${offset}&_t=${Date.now()}`, {
      headers: adminHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const page = (await res.json()) as { items: T[]; total: number };
    items.push(...page.items);
    offset += pageSize;
    if (page.items.length === 0 || offset >= page.total) return { items, total: page.total };
  }
}
