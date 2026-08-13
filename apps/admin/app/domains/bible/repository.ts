import { API, adminHeaders } from '../../lib/api';
import type { ConfigDto } from '@sdarm/types';
import type { BibleCatalogEntry, BibleLicense, CatalogPage } from './types';

/**
 * One page of the YouVersion catalog.
 *
 * With `allAvailable` the response also contains Bibles our app key has no
 * license for, flagged `licensed: false`. That is the only way to tell "this
 * translation does not exist" apart from "this translation exists but we may
 * not read it" — by far the most common reason a version appears to be missing.
 */
export async function fetchCatalog(language: string, pageToken?: string, allAvailable = false): Promise<CatalogPage> {
  const params = new URLSearchParams({ language });
  if (pageToken) params.set('pageToken', pageToken);
  if (allAvailable) params.set('allAvailable', 'true');
  const res = await fetch(`${API}/api/v1/admin/bible/catalog?${params}`, { headers: adminHeaders() });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as CatalogPage;
}

/** All license agreements, or just the one governing `bibleId`. */
export async function fetchLicenses(bibleId?: number): Promise<BibleLicense[]> {
  const params = new URLSearchParams();
  if (bibleId) params.set('bibleId', String(bibleId));
  const res = await fetch(`${API}/api/v1/admin/bible/licenses?${params}`, { headers: adminHeaders() });
  if (!res.ok) return [];
  const data = (await res.json()) as { items: BibleLicense[] };
  return data.items ?? [];
}

/** Enabled YouVersion Bible IDs, read from the shared site config object. */
export async function fetchEnabledIds(): Promise<number[]> {
  const res = await fetch(`${API}/api/v1/config?_t=${Date.now()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const config = (await res.json()) as ConfigDto;
  const raw = config.bible_translations;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
  } catch {
    return [];
  }
}

export async function saveEnabledIds(ids: number[]): Promise<void> {
  const res = await fetch(`${API}/api/v1/admin/config/bible_translations`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify({ value: JSON.stringify(ids) }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

/**
 * Metadata for already-enabled IDs, so saved picks render even when not on the
 * current page.
 *
 * This reads the *public* translations endpoint, which carries no `licensed`
 * field — it only ever returns translations that actually resolved against
 * YouVersion, so anything here is licensed by definition.
 */
export async function fetchEnabledDetails(): Promise<BibleCatalogEntry[]> {
  const res = await fetch(`${API}/api/v1/bible/translations?_t=${Date.now()}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { items: Omit<BibleCatalogEntry, 'licensed'>[] };
  return (data.items ?? []).map((item) => ({ ...item, licensed: true }));
}
