import type { BibleAdminTranslationDto, BibleLicenseBasis, BibleSource } from '@sdarm/types';
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

// ── Library rows ─────────────────────────────────────────────────────────────

export const SOURCE_LABEL: Record<BibleSource, string> = {
  local: 'Self-hosted',
  youversion: 'YouVersion',
};

export const SOURCE_NOTE: Record<BibleSource, string> = {
  local: 'Verses are stored in our own sdarm-bible database. Nothing leaves our infrastructure to serve them.',
  youversion: 'Verses are fetched from the YouVersion Platform API (Life.Church, USA) server-side on demand.',
};

export const BASIS_LABEL: Record<BibleLicenseBasis, string> = {
  'public-domain': 'Public domain',
  permission: 'Written permission',
  provider: 'Provider terms',
};

/**
 * An allowlist entry that has no row in the library.
 *
 * It happens when a translation was enabled before it had a record — a bare
 * numeric id in an old allowlist, or a YouVersion Bible that has since been
 * withdrawn. The row is rendered rather than dropped: silently hiding an id
 * that the public API is still serving is the worst of both.
 */
export interface OrphanRow {
  id: string;
}

export type LibraryRow = BibleAdminTranslationDto | OrphanRow;

/**
 * Narrows to the row that has a record. The predicate deliberately points this
 * way round: `OrphanRow`'s only field (`id`) also exists on
 * `BibleAdminTranslationDto`, so a `row is OrphanRow` predicate narrows *both*
 * arms to `never` at the call site — a known TypeScript quirk with overlapping
 * structural shapes (microsoft/TypeScript#13995).
 */
export function hasRecord(row: LibraryRow): row is BibleAdminTranslationDto {
  return 'source' in row;
}

// ── License record form ──────────────────────────────────────────────────────

/**
 * The license record as the form holds it: every field a string or boolean, so
 * a half-typed number or a cleared date is representable without becoming
 * `NaN` or `null` mid-keystroke.
 */
export interface LicenseForm {
  basis: BibleLicenseBasis;
  rightsHolder: string;
  notice: string;
  provenance: string;
  permissionRef: string;
  /** `yyyy-mm-dd`, or '' when unset. */
  permissionDate: string;
  allowDownload: boolean;
  allowOffline: boolean;
  allowSearchIndex: boolean;
  allowProjector: boolean;
  /** '' means uncapped. */
  maxVersesPerRequest: string;
}

/** Body of `PATCH /admin/bible/translations/{id}` — mirrors the DTO's shape. */
export interface TranslationPatch {
  license: {
    basis: BibleLicenseBasis;
    rightsHolder: string | null;
    notice: string | null;
    provenance: string | null;
    allowDownload: boolean;
    allowOffline: boolean;
    allowSearchIndex: boolean;
    allowProjector: boolean;
    maxVersesPerRequest: number | null;
  };
  permissionRef: string | null;
  permissionDate: string | null;
}

export function toLicenseForm(t: BibleAdminTranslationDto): LicenseForm {
  return {
    basis: t.license.basis,
    rightsHolder: t.license.rightsHolder ?? '',
    notice: t.license.notice ?? '',
    provenance: t.license.provenance ?? '',
    permissionRef: t.permissionRef ?? '',
    permissionDate: t.permissionDate ? t.permissionDate.slice(0, 10) : '',
    allowDownload: t.license.allowDownload,
    allowOffline: t.license.allowOffline,
    allowSearchIndex: t.license.allowSearchIndex,
    allowProjector: t.license.allowProjector,
    maxVersesPerRequest: t.license.maxVersesPerRequest === null ? '' : String(t.license.maxVersesPerRequest),
  };
}

export function fromLicenseForm(f: LicenseForm): TranslationPatch {
  const cap = Number.parseInt(f.maxVersesPerRequest, 10);
  return {
    license: {
      basis: f.basis,
      rightsHolder: f.rightsHolder.trim() || null,
      notice: f.notice.trim() || null,
      provenance: f.provenance.trim() || null,
      allowDownload: f.allowDownload,
      allowOffline: f.allowOffline,
      allowSearchIndex: f.allowSearchIndex,
      allowProjector: f.allowProjector,
      maxVersesPerRequest: Number.isInteger(cap) && cap > 0 ? cap : null,
    },
    permissionRef: f.permissionRef.trim() || null,
    permissionDate: f.permissionDate || null,
  };
}
