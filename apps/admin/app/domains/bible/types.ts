import { LANGUAGES } from './publicDomain';

export interface BibleCatalogEntry {
  id: number;
  code: string;
  name: string;
  abbreviation: string;
  language: string;
  copyright: string | null;
  /**
   * Whether our YouVersion app key holds a license covering this Bible.
   * Always `true` on the default listing; only an `allAvailable` listing can
   * return `false`.
   */
  licensed: boolean;
}

export interface CatalogPage {
  items: BibleCatalogEntry[];
  total: number;
  nextPageToken: string | null;
}

export interface BibleLicense {
  id: string;
  name: string;
  organization: string | null;
  bibleIds: number[];
}

/**
 * Catalog language filters, derived from the shared language table so the
 * filter list and the public-domain matching can never drift apart.
 * `all` browses the full ~1,500-Bible catalog.
 */
export const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  ...LANGUAGES.map((l) => ({ code: l.iso3, label: l.label })),
  { code: 'all', label: 'All languages' },
];
