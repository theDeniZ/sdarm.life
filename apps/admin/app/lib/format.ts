export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function toLocalDatetime(iso: string | null): string {
  if (!iso) return new Date().toISOString().slice(0, 16);
  return new Date(iso).toISOString().slice(0, 16);
}

// ── Month bucketing (dashboard + statistics charts) ─────────────────────────

export function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}

// Keys for the last n calendar months, oldest first, ending with the current month.
export function lastMonthKeys(n: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short' });
}

// Count ISO dates into the given month buckets (dates outside the range are dropped).
export function bucketByMonth(dates: string[], keys: string[]): number[] {
  const counts = new Map<string, number>();
  for (const iso of dates) {
    const key = monthKey(iso);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return keys.map((k) => counts.get(k) ?? 0);
}
