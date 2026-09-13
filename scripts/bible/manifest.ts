/**
 * One record per source file in `bible-data/` — the six public-domain texts
 * ingest.ts turns into `sdarm-bible` rows.
 *
 * All six are public domain, so the license record is identical in shape for
 * every entry: no rights holder, no notice to render, all four gates open,
 * no per-request verse cap. `provenance` is the one field that differs — a
 * short factual line, always in English, because `@sdarm/types`'
 * `BibleLicenseDto.provenance` is returned by the API and rendered verbatim
 * wherever the text is shown.
 */

export interface BibleManifestLicense {
  basis: 'public-domain';
  rightsHolder: null;
  notice: null;
  provenance: string;
  permissionRef: null;
  permissionDate: null;
  allowDownload: true;
  allowOffline: true;
  allowSearchIndex: true;
  allowProjector: true;
  maxVersesPerRequest: null;
}

export interface BibleManifestEntry {
  /** File under `bible-data/`. */
  file: string;
  /** Prefixed id written to `bible_translations.id` and the KV allowlist. */
  id: string;
  /** URL slug — `bible_translations.slug`. */
  slug: string;
  /** Title, e.g. 'Luther 1912'. */
  name: string;
  abbreviation: string;
  /** BCP-47 short tag: 'de', 'en', 'ru', 'es'. */
  language: string;
  year: number;
  license: BibleManifestLicense;
}

function pd(provenance: string): BibleManifestLicense {
  return {
    basis: 'public-domain',
    rightsHolder: null,
    notice: null,
    provenance,
    permissionRef: null,
    permissionDate: null,
    allowDownload: true,
    allowOffline: true,
    allowSearchIndex: true,
    allowProjector: true,
    maxVersesPerRequest: null,
  };
}

export const BIBLE_MANIFEST: BibleManifestEntry[] = [
  {
    file: 'luther1912.json',
    id: 'loc:luther1912',
    slug: 'luther1912',
    name: 'Luther 1912',
    abbreviation: 'LUT1912',
    language: 'de',
    year: 1912,
    license: pd("Public domain. Martin Luther's German translation, 1912 revision."),
  },
  {
    file: 'elberfelder1905.json',
    id: 'loc:elberfelder1905',
    slug: 'elberfelder1905',
    name: 'Elberfelder 1905 (unrevidiert)',
    abbreviation: 'ELB1905',
    language: 'de',
    year: 1905,
    license: pd('Public domain. Elberfelder Bible, 1905 unrevised edition.'),
  },
  {
    file: 'schlachter.json',
    id: 'loc:schlachter1905',
    slug: 'schlachter1905',
    name: 'Schlachter 1905',
    abbreviation: 'SCH1905',
    language: 'de',
    year: 1905,
    license: pd("Public domain. Franz Eugen Schlachter's German translation, 1905 edition."),
  },
  {
    file: 'kjv.json',
    id: 'loc:kjv',
    slug: 'kjv',
    name: 'King James Version',
    abbreviation: 'KJV',
    language: 'en',
    year: 1769,
    license: pd(
      'Public domain. King James Version, first published 1611, following the standard 1769 Oxford (Blayney) edition.',
    ),
  },
  {
    file: 'spanish.json',
    id: 'loc:rv1909',
    slug: 'rv1909',
    name: 'Reina-Valera 1909',
    abbreviation: 'RV1909',
    language: 'es',
    year: 1909,
    license: pd('Public domain. Reina-Valera Spanish translation, 1909 revision.'),
  },
  {
    file: 'synodal.json',
    id: 'loc:synodal',
    slug: 'synodal',
    name: 'Russian Synodal 1876',
    abbreviation: 'СП',
    language: 'ru',
    year: 1876,
    license: pd('Public domain. Russian Synodal Bible, published 1876.'),
  },
];
