import { API, adminHeaders } from '../../lib/api';
import type { BibleAdminTranslationDto, ConfigDto, ListResponse } from '@sdarm/types';
import type { BibleCatalogEntry, BibleLicense, CatalogPage, TranslationPatch } from './types';

async function failure(res: Response): Promise<Error> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return new Error(body.error ?? `HTTP ${res.status}`);
}

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
  if (!res.ok) throw await failure(res);
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

/**
 * Every translation record we hold, both sources, served or not.
 *
 * This is the library. The allowlist decides which of these rows the public
 * actually sees — a record on its own is invisible.
 */
export async function fetchLibrary(): Promise<BibleAdminTranslationDto[]> {
  const res = await fetch(`${API}/api/v1/admin/bible/translations?_t=${Date.now()}`, { headers: adminHeaders() });
  if (!res.ok) throw await failure(res);
  const data = (await res.json()) as ListResponse<BibleAdminTranslationDto>;
  return data.items ?? [];
}

/**
 * The ordered allowlist, read from the shared site config object.
 *
 * Ids are prefixed (`loc:luther1912`, `yv:51`). A bare number is an allowlist
 * written before self-hosting existed and still means a YouVersion Bible, so it
 * is normalised here exactly as the API normalises it.
 */
export async function fetchAllowlist(): Promise<string[]> {
  const res = await fetch(`${API}/api/v1/config?_t=${Date.now()}`);
  if (!res.ok) throw await failure(res);
  const config = (await res.json()) as ConfigDto;
  const raw = config.bible_translations;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => (typeof entry === 'number' ? `yv:${entry}` : typeof entry === 'string' ? entry.trim() : ''))
      .map((id) => (/^\d+$/.test(id) ? `yv:${id}` : id))
      .filter((id) => id.length > 0);
  } catch {
    return [];
  }
}

/** Replaces the allowlist, in this order. Does not purge any cache — see `takedown`. */
export async function saveAllowlist(ids: string[]): Promise<void> {
  const res = await fetch(`${API}/api/v1/admin/bible/allowlist`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw await failure(res);
}

/** Writes the license record and the gates. The id is prefixed, so it is encoded. */
export async function patchTranslation(id: string, patch: TranslationPatch): Promise<void> {
  const res = await fetch(`${API}/api/v1/admin/bible/translations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw await failure(res);
}

/**
 * Creates a library record for a YouVersion Bible that has none yet.
 *
 * A catalog row is not a record — it is whatever YouVersion happened to return.
 * Serving a translation means holding a row with a license basis and gates on
 * it, so picking one from the catalog creates that row first.
 */
export async function createYouVersionRecord(entry: BibleCatalogEntry): Promise<BibleAdminTranslationDto> {
  const res = await fetch(`${API}/api/v1/admin/bible/translations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify({
      id: `yv:${entry.id}`,
      slug: entry.code,
      name: entry.name,
      abbreviation: entry.abbreviation,
      language: entry.language,
      year: 0,
      lxxPsalms: false,
    }),
  });
  if (!res.ok) throw await failure(res);
  return (await res.json()) as BibleAdminTranslationDto;
}

/**
 * Takes a translation down now: drops it from the allowlist **and** purges the
 * edge cache for its URLs, which a plain allowlist save cannot do.
 */
export async function takedown(id: string): Promise<void> {
  const res = await fetch(`${API}/api/v1/admin/bible/takedown`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw await failure(res);
}
