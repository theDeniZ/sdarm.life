/**
 * Curated public-domain knowledge base for Bible translations.
 *
 * ─── Why this exists ─────────────────────────────────────────────────────────
 * YouVersion returns a free-text `copyright` string per Bible and nothing more.
 * When that string literally says "Public Domain" we trust it — the publisher is
 * the authority on their own text. For everything else the operator is left
 * guessing, so this table encodes *why* a translation is or is not free, and the
 * rules below turn that into a per-country answer.
 *
 * ─── Why per country ─────────────────────────────────────────────────────────
 * Public domain is not a global property. Copyright terms differ (life+50 in
 * China, life+70 across the EU, life+100 in Mexico), and some works carry
 * jurisdiction-specific quirks — the KJV is freely usable in the United States
 * but sits under perpetual Crown copyright in the United Kingdom. Hosting the
 * same app for a different country can therefore change the answer, which is
 * what the country selector in Admin → Bible is for.
 *
 * ⚠️ This is operator guidance, not legal advice. Publication years and death
 * dates are the commonly cited ones; a revision can carry its own fresh
 * copyright even when the underlying text is ancient. Verify before relying on
 * it commercially.
 */

// ─── Languages ────────────────────────────────────────────────────────────────

/**
 * Single source of truth for language codes across the Bible admin.
 *
 * YouVersion filters with ISO 639-3 (`deu`) but reports each Bible's
 * `language_tag` as BCP47, whose primary subtag is usually ISO 639-1 (`de`).
 * Both are kept here so the catalog filter and the per-row matching agree.
 */
export interface BibleLanguage {
  /** ISO 639-3 — what `language_ranges[]` expects. */
  iso3: string;
  /** ISO 639-1 — the primary subtag YouVersion reports back. */
  iso1: string;
  label: string;
}

export const LANGUAGES: BibleLanguage[] = [
  { iso3: 'deu', iso1: 'de', label: 'German' },
  { iso3: 'eng', iso1: 'en', label: 'English' },
  { iso3: 'rus', iso1: 'ru', label: 'Russian' },
  { iso3: 'ron', iso1: 'ro', label: 'Romanian' },
  { iso3: 'ukr', iso1: 'uk', label: 'Ukrainian' },
  { iso3: 'spa', iso1: 'es', label: 'Spanish' },
  { iso3: 'fra', iso1: 'fr', label: 'French' },
  { iso3: 'por', iso1: 'pt', label: 'Portuguese' },
  { iso3: 'ita', iso1: 'it', label: 'Italian' },
  { iso3: 'nld', iso1: 'nl', label: 'Dutch' },
  { iso3: 'pol', iso1: 'pl', label: 'Polish' },
  { iso3: 'ces', iso1: 'cs', label: 'Czech' },
  { iso3: 'hun', iso1: 'hu', label: 'Hungarian' },
  { iso3: 'hrv', iso1: 'hr', label: 'Croatian' },
  { iso3: 'swe', iso1: 'sv', label: 'Swedish' },
  { iso3: 'nor', iso1: 'no', label: 'Norwegian' },
  { iso3: 'dan', iso1: 'da', label: 'Danish' },
  { iso3: 'fin', iso1: 'fi', label: 'Finnish' },
  { iso3: 'zho', iso1: 'zh', label: 'Chinese' },
  { iso3: 'jpn', iso1: 'ja', label: 'Japanese' },
  { iso3: 'kor', iso1: 'ko', label: 'Korean' },
  { iso3: 'ell', iso1: 'el', label: 'Greek' },
  { iso3: 'heb', iso1: 'he', label: 'Hebrew' },
  { iso3: 'lat', iso1: 'la', label: 'Latin' },
];

const ISO1_TO_ISO3 = new Map(LANGUAGES.map((l) => [l.iso1, l.iso3]));

/** Normalise whatever YouVersion reported (`de`, `de-DE`, `deu`) to ISO 639-3. */
export function toIso3(languageTag: string): string {
  const primary = languageTag.toLowerCase().split('-')[0];
  return ISO1_TO_ISO3.get(primary) ?? primary;
}

export function languageLabel(languageTag: string): string {
  const iso3 = toIso3(languageTag);
  return LANGUAGES.find((l) => l.iso3 === iso3)?.label ?? languageTag;
}

// ─── Jurisdictions ────────────────────────────────────────────────────────────

export interface Jurisdiction {
  /** ISO 3166-1 alpha-2. */
  code: string;
  name: string;
  /** Years after the author's death before the work is free. */
  authorDeathTerm: number;
  /** Years after publication, for committee/anonymous/corporate works. */
  publicationTerm: number;
  /**
   * Fixed publication cutoff that overrides the term, used by the US rule
   * "published more than 95 years ago is public domain". Expressed as an offset
   * so the table never goes stale.
   */
  publicationCutoffYearsAgo?: number;
  note?: string;
}

export const JURISDICTIONS: Jurisdiction[] = [
  { code: 'DE', name: 'Germany', authorDeathTerm: 70, publicationTerm: 70 },
  { code: 'AT', name: 'Austria', authorDeathTerm: 70, publicationTerm: 70 },
  { code: 'CH', name: 'Switzerland', authorDeathTerm: 70, publicationTerm: 70 },
  { code: 'FR', name: 'France', authorDeathTerm: 70, publicationTerm: 70 },
  { code: 'ES', name: 'Spain', authorDeathTerm: 70, publicationTerm: 70 },
  { code: 'IT', name: 'Italy', authorDeathTerm: 70, publicationTerm: 70 },
  { code: 'NL', name: 'Netherlands', authorDeathTerm: 70, publicationTerm: 70 },
  { code: 'PL', name: 'Poland', authorDeathTerm: 70, publicationTerm: 70 },
  { code: 'CZ', name: 'Czechia', authorDeathTerm: 70, publicationTerm: 70 },
  { code: 'HU', name: 'Hungary', authorDeathTerm: 70, publicationTerm: 70 },
  { code: 'HR', name: 'Croatia', authorDeathTerm: 70, publicationTerm: 70 },
  { code: 'RO', name: 'Romania', authorDeathTerm: 70, publicationTerm: 70 },
  { code: 'PT', name: 'Portugal', authorDeathTerm: 70, publicationTerm: 70 },
  { code: 'SE', name: 'Sweden', authorDeathTerm: 70, publicationTerm: 70 },
  { code: 'FI', name: 'Finland', authorDeathTerm: 70, publicationTerm: 70 },
  { code: 'UA', name: 'Ukraine', authorDeathTerm: 70, publicationTerm: 70 },
  { code: 'RU', name: 'Russia', authorDeathTerm: 70, publicationTerm: 70 },
  {
    code: 'GB',
    name: 'United Kingdom',
    authorDeathTerm: 70,
    publicationTerm: 70,
    note: 'Crown copyright applies to the KJV and Book of Common Prayer in perpetuity, via letters patent held by Cambridge University Press.',
  },
  {
    code: 'US',
    name: 'United States',
    authorDeathTerm: 70,
    publicationTerm: 95,
    publicationCutoffYearsAgo: 95,
    note: 'Anything published more than 95 years ago is public domain regardless of the author.',
  },
  { code: 'CA', name: 'Canada', authorDeathTerm: 70, publicationTerm: 70 },
  { code: 'AU', name: 'Australia', authorDeathTerm: 70, publicationTerm: 70 },
  { code: 'NZ', name: 'New Zealand', authorDeathTerm: 50, publicationTerm: 50 },
  { code: 'BR', name: 'Brazil', authorDeathTerm: 70, publicationTerm: 70 },
  { code: 'MX', name: 'Mexico', authorDeathTerm: 100, publicationTerm: 100, note: 'The longest term in the world.' },
  { code: 'JP', name: 'Japan', authorDeathTerm: 70, publicationTerm: 70 },
  { code: 'CN', name: 'China', authorDeathTerm: 50, publicationTerm: 50 },
  { code: 'IN', name: 'India', authorDeathTerm: 60, publicationTerm: 60 },
  { code: 'KR', name: 'South Korea', authorDeathTerm: 70, publicationTerm: 70 },
];

export const DEFAULT_JURISDICTION = 'DE';

// ─── Translations ─────────────────────────────────────────────────────────────

export type PdBasis =
  /** Rights holder released it outright — free everywhere, no term to run. */
  | { kind: 'dedication' }
  /** Term runs from the translator's death. */
  | { kind: 'authorDeath'; year: number; who: string }
  /** Committee or anonymous work — term runs from first publication. */
  | { kind: 'publication'; year: number };

export interface PdTranslation {
  title: string;
  /** ISO 639-3. */
  language: string;
  /** Abbreviations YouVersion might use, normalised on lookup. */
  aliases: string[];
  basis: PdBasis;
  /** Country overrides that beat the computed term entirely. */
  overrides?: Record<string, 'public' | 'restricted'>;
  note?: string;
}

/**
 * Curated list. Ordered by language, then roughly by how likely an operator is
 * to want it. Entries deliberately include a few *non*-free translations that
 * are widely assumed to be free — surfacing that is the point.
 */
export const PD_TRANSLATIONS: PdTranslation[] = [
  // ── English ──
  {
    title: 'World English Bible',
    language: 'eng',
    aliases: ['WEB', 'WEBBE', 'WEBUS'],
    basis: { kind: 'dedication' },
    note: 'Explicitly dedicated to the public domain. The safest choice anywhere.',
  },
  {
    title: 'Berean Standard Bible',
    language: 'eng',
    aliases: ['BSB'],
    basis: { kind: 'dedication' },
    note: 'Released to the public domain by the publisher.',
  },
  {
    title: 'King James Version',
    language: 'eng',
    aliases: ['KJV', 'KJV1611', 'AKJV', 'KJVAAE', 'KJVAE'],
    basis: { kind: 'publication', year: 1611 },
    overrides: { GB: 'restricted' },
    note: 'Free in the US and most of the world, but under perpetual Crown copyright in the UK (letters patent, Cambridge University Press). This is a common reason it sits behind a license agreement rather than being freely open.',
  },
  { title: 'American Standard Version', language: 'eng', aliases: ['ASV'], basis: { kind: 'publication', year: 1901 } },
  {
    title: "Young's Literal Translation",
    language: 'eng',
    aliases: ['YLT', 'YLT98'],
    basis: { kind: 'authorDeath', year: 1888, who: 'Robert Young' },
  },
  {
    title: 'Darby Translation',
    language: 'eng',
    aliases: ['DARBY', 'DBY'],
    basis: { kind: 'authorDeath', year: 1882, who: 'John Nelson Darby' },
  },
  {
    title: "Webster's Bible",
    language: 'eng',
    aliases: ['WBT', 'WEBSTER'],
    basis: { kind: 'authorDeath', year: 1843, who: 'Noah Webster' },
  },
  { title: 'Geneva Bible', language: 'eng', aliases: ['GNV', 'GENEVA'], basis: { kind: 'publication', year: 1599 } },
  {
    title: 'Douay-Rheims (Challoner)',
    language: 'eng',
    aliases: ['DRA', 'DRC', 'RHE'],
    basis: { kind: 'publication', year: 1752 },
  },
  {
    title: 'JPS Tanakh 1917',
    language: 'eng',
    aliases: ['JPS', 'JPS1917'],
    basis: { kind: 'publication', year: 1917 },
  },
  {
    title: 'Bible in Basic English',
    language: 'eng',
    aliases: ['BBE'],
    basis: { kind: 'publication', year: 1965 },
    note: 'Widely circulated as public domain on the claim that the US copyright was never renewed. That claim is not settled and the term has not run in life+70 countries — treat with care.',
  },

  // ── German ──
  {
    title: 'Lutherbibel 1912',
    language: 'deu',
    aliases: ['DELUT', 'LUT1912', 'LUTH1912'],
    basis: { kind: 'publication', year: 1912 },
  },
  {
    title: 'Lutherbibel 1545',
    language: 'deu',
    aliases: ['LUT1545', 'DELUTH1545'],
    basis: { kind: 'publication', year: 1545 },
  },
  {
    title: 'Elberfelder 1905',
    language: 'deu',
    aliases: ['ELB1905', 'DEELB', 'ELB'],
    basis: { kind: 'publication', year: 1905 },
  },
  { title: 'Elberfelder 1871', language: 'deu', aliases: ['ELB1871'], basis: { kind: 'publication', year: 1871 } },
  {
    title: 'Schlachter 1951',
    language: 'deu',
    aliases: ['SCH1951', 'SCH51'],
    basis: { kind: 'publication', year: 1951 },
    note: 'Only the 1951 edition. Schlachter 2000 is a separate copyrighted work of the Genfer Bibelgesellschaft.',
  },
  {
    title: 'Menge-Bibel',
    language: 'deu',
    aliases: ['MENG', 'MENGE'],
    basis: { kind: 'authorDeath', year: 1939, who: 'Hermann Menge' },
  },
  {
    title: 'Textbibel 1906',
    language: 'deu',
    aliases: ['TEXTBIBEL', 'TB1906'],
    basis: { kind: 'publication', year: 1906 },
  },

  // ── Spanish ──
  {
    title: 'Reina-Valera 1909',
    language: 'spa',
    aliases: ['RVR09', 'RV1909', 'RVA1909'],
    basis: { kind: 'publication', year: 1909 },
  },
  {
    title: 'Reina-Valera Antigua',
    language: 'spa',
    aliases: ['RVA', 'RV1602'],
    basis: { kind: 'publication', year: 1602 },
    note: 'Reina-Valera 1960 is a separate copyrighted revision of the United Bible Societies — do not confuse the two.',
  },
  {
    title: 'Sagradas Escrituras 1569',
    language: 'spa',
    aliases: ['SEV', 'SE1569'],
    basis: { kind: 'publication', year: 1569 },
  },

  // ── French ──
  {
    title: 'Louis Segond 1910',
    language: 'fra',
    aliases: ['LSG', 'LSG1910'],
    basis: { kind: 'authorDeath', year: 1885, who: 'Louis Segond' },
  },
  { title: 'Ostervald 1867', language: 'fra', aliases: ['OST', 'OST1867'], basis: { kind: 'publication', year: 1867 } },
  { title: 'Martin 1744', language: 'fra', aliases: ['MARTIN', 'MAR1744'], basis: { kind: 'publication', year: 1744 } },
  {
    title: 'Darby (français)',
    language: 'fra',
    aliases: ['DBY', 'DARBYFR'],
    basis: { kind: 'authorDeath', year: 1882, who: 'John Nelson Darby' },
  },

  // ── Portuguese ──
  {
    title: 'Almeida Revista e Corrigida',
    language: 'por',
    aliases: ['ARC', 'ALMEIDA'],
    basis: { kind: 'publication', year: 1898 },
    note: 'Almeida Corrigida Fiel (ACF) is a separate copyrighted revision.',
  },

  // ── Italian ──
  { title: 'Diodati 1649', language: 'ita', aliases: ['DIODATI', 'GDB'], basis: { kind: 'publication', year: 1649 } },
  {
    title: 'Riveduta 1927 (Luzzi)',
    language: 'ita',
    aliases: ['RIV', 'RIV1927'],
    basis: { kind: 'authorDeath', year: 1948, who: 'Giovanni Luzzi' },
  },

  // ── Dutch ──
  {
    title: 'Statenvertaling',
    language: 'nld',
    aliases: ['SV', 'STATENVERTALING', 'SV1750'],
    basis: { kind: 'publication', year: 1637 },
  },

  // ── Russian / Ukrainian ──
  {
    title: 'Synodal Translation',
    language: 'rus',
    aliases: ['SYNO', 'RUSV', 'SZ'],
    basis: { kind: 'publication', year: 1876 },
  },
  {
    title: 'Kulish Translation',
    language: 'ukr',
    aliases: ['KULISH', 'UKRK'],
    basis: { kind: 'authorDeath', year: 1897, who: 'Panteleimon Kulish' },
  },

  // ── Central & Eastern Europe ──
  { title: 'Biblia Gdańska', language: 'pol', aliases: ['BG', 'PBG'], basis: { kind: 'publication', year: 1632 } },
  { title: 'Bible kralická', language: 'ces', aliases: ['BKR', 'CZEBKR'], basis: { kind: 'publication', year: 1613 } },
  { title: 'Károli', language: 'hun', aliases: ['KAR', 'HUNKAR'], basis: { kind: 'publication', year: 1590 } },
  {
    title: 'Cornilescu 1924',
    language: 'ron',
    aliases: ['RMNN', 'CORNILESCU', 'VDC'],
    basis: { kind: 'authorDeath', year: 1975, who: 'Dumitru Cornilescu' },
    note: 'Very widely assumed to be public domain, but it is not — the term runs to 2046 in life+70 countries.',
  },

  // ── Nordic ──
  {
    title: 'Svenska Bibeln 1917',
    language: 'swe',
    aliases: ['SV1917', 'SVEN1917'],
    basis: { kind: 'publication', year: 1917 },
  },
  {
    title: 'Karl XII 1873',
    language: 'swe',
    aliases: ['SK1873', 'KARLXII'],
    basis: { kind: 'publication', year: 1873 },
  },
  {
    title: 'Bibelen 1930',
    language: 'nor',
    aliases: ['NOR1930', 'DNB1930'],
    basis: { kind: 'publication', year: 1930 },
  },
  {
    title: 'Bibelen 1931',
    language: 'dan',
    aliases: ['DAN1931', 'DK1931'],
    basis: { kind: 'publication', year: 1931 },
  },
  {
    title: 'Raamattu 1933/38',
    language: 'fin',
    aliases: ['FINPR', 'PR1938'],
    basis: { kind: 'publication', year: 1938 },
  },

  // ── Asia ──
  {
    title: 'Chinese Union Version',
    language: 'zho',
    aliases: ['CUV', 'CUVS', 'CUVT', 'RCUV'],
    basis: { kind: 'publication', year: 1919 },
  },
  {
    title: '文語訳 (Meiji/Taisho)',
    language: 'jpn',
    aliases: ['JAKJV', 'BUNGO', 'JCLASSIC'],
    basis: { kind: 'publication', year: 1917 },
    note: 'The modern 口語訳 and 新共同訳 are copyrighted by the Japan Bible Society.',
  },

  // ── Original languages ──
  {
    title: 'Westcott–Hort 1881',
    language: 'ell',
    aliases: ['WH', 'WHNU', 'WH1881'],
    basis: { kind: 'publication', year: 1881 },
  },
  { title: 'Nestle 1904', language: 'ell', aliases: ['NESTLE', 'NE1904'], basis: { kind: 'publication', year: 1904 } },
  {
    title: 'Textus Receptus',
    language: 'ell',
    aliases: ['TR', 'TR1550', 'SBLG'],
    basis: { kind: 'publication', year: 1550 },
  },
  {
    title: 'Westminster Leningrad Codex',
    language: 'heb',
    aliases: ['WLC', 'WLCO'],
    basis: { kind: 'publication', year: 1937 },
  },
  {
    title: 'Vulgata Clementina',
    language: 'lat',
    aliases: ['VULG', 'CLEMENTINE', 'VUL'],
    basis: { kind: 'publication', year: 1592 },
  },
];

// ─── Assessment ───────────────────────────────────────────────────────────────

export type PdStatus = 'public' | 'copyrighted' | 'unknown';

export interface PdVerdict {
  status: PdStatus;
  /** Where the verdict came from, so the UI can be honest about confidence. */
  source: 'youversion' | 'curated' | 'none';
  reason: string;
  /** The curated entry we matched, when there was one. */
  entry: PdTranslation | null;
}

function normalise(abbr: string): string {
  return abbr.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Match a YouVersion catalog row against the curated table.
 *
 * Matching is on the normalised abbreviation within the same language. It is a
 * heuristic — YouVersion abbreviations are not stable identifiers and the same
 * short code is reused across languages, hence the language guard.
 */
export function findPdEntry(row: { abbreviation: string; language: string }): PdTranslation | null {
  const abbr = normalise(row.abbreviation);
  if (!abbr) return null;
  const iso3 = toIso3(row.language);
  return PD_TRANSLATIONS.find((t) => t.language === iso3 && t.aliases.some((a) => normalise(a) === abbr)) ?? null;
}

/** True when YouVersion's own copyright string declares the text free. */
export function copyrightSaysPublicDomain(copyright: string | null): boolean {
  return !!copyright && /public\s*domain|gemeinfrei|dominio\s*p[uú]blico/i.test(copyright);
}

export function getJurisdiction(code: string): Jurisdiction {
  return JURISDICTIONS.find((j) => j.code === code) ?? JURISDICTIONS[0];
}

/**
 * Decide whether a translation is free to use in one country.
 *
 * Order of authority:
 *   1. YouVersion's own copyright string — the publisher's own declaration.
 *   2. The curated table, evaluated against that country's term.
 *   3. Unknown; the operator has to check the copyright line themselves.
 */
export function assessPublicDomain(
  row: { abbreviation: string; language: string; copyright: string | null },
  jurisdictionCode: string,
  now: number = new Date().getFullYear()
): PdVerdict {
  const entry = findPdEntry(row);

  if (copyrightSaysPublicDomain(row.copyright)) {
    return { status: 'public', source: 'youversion', reason: 'YouVersion reports this text as public domain.', entry };
  }

  if (!entry) {
    return {
      status: 'unknown',
      source: 'none',
      reason: 'Not in the curated list and YouVersion does not declare it public domain. Check the copyright line.',
      entry: null,
    };
  }

  const jur = getJurisdiction(jurisdictionCode);
  const override = entry.overrides?.[jur.code];
  if (override) {
    return {
      status: override === 'public' ? 'public' : 'copyrighted',
      source: 'curated',
      reason:
        override === 'restricted'
          ? `Specifically restricted in ${jur.name}${jur.note ? ` — ${jur.note}` : '.'}`
          : `Specifically free in ${jur.name}.`,
      entry,
    };
  }

  if (entry.basis.kind === 'dedication') {
    return {
      status: 'public',
      source: 'curated',
      reason: 'Dedicated to the public domain by the rights holder — free in every country.',
      entry,
    };
  }

  if (entry.basis.kind === 'authorDeath') {
    const free = entry.basis.year + jur.authorDeathTerm;
    const isFree = free < now;
    return {
      status: isFree ? 'public' : 'copyrighted',
      source: 'curated',
      reason: `${entry.basis.who} died ${entry.basis.year}; ${jur.name} runs life + ${jur.authorDeathTerm} years, so the text is free from ${free + 1}.`,
      entry,
    };
  }

  // Publication-based. The US cutoff, where present, is the more generous rule.
  const cutoff = jur.publicationCutoffYearsAgo ? now - jur.publicationCutoffYearsAgo : null;
  if (cutoff !== null && entry.basis.year < cutoff) {
    return {
      status: 'public',
      source: 'curated',
      reason: `Published ${entry.basis.year}, more than ${jur.publicationCutoffYearsAgo} years ago — public domain in ${jur.name}.`,
      entry,
    };
  }

  const free = entry.basis.year + jur.publicationTerm;
  const isFree = free < now;
  return {
    status: isFree ? 'public' : 'copyrighted',
    source: 'curated',
    reason: `Published ${entry.basis.year}; ${jur.name} runs publication + ${jur.publicationTerm} years, so the text is free from ${free + 1}.`,
    entry,
  };
}

/** Curated entries for one language, for the "what could I enable?" reference panel. */
export function pdTranslationsForLanguage(iso3: string): PdTranslation[] {
  if (iso3 === 'all' || iso3 === '*') return PD_TRANSLATIONS;
  return PD_TRANSLATIONS.filter((t) => t.language === iso3);
}
