export interface PostDto {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  author: string | null;
  videoUrl: string | null;
  coverKey: string | null;
  coverAlt: string | null;
  thumbKey: string | null;
  isFeatured: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ImageDto {
  key: string;
  size: number;
  uploaded: string;
  usedIn: { type: string; label: string }[];
}

export interface SubscriberDto {
  id: number;
  email: string;
  language: string;
  confirmedAt: string | null;
  createdAt: string;
}

export type ConfigDto = Record<string, string | null>;

export interface ListResponse<T> {
  items: T[];
  total: number;
}

export interface SongbookDto {
  id: number;
  title: string;
  slug: string;
  language: string;
  description: string | null;
  coverKey: string | null;
  sortOrder: number;
  songCount: number;
}

export interface SongListItemDto {
  id: number;
  number: number;
  title: string;
  author: string | null;
  copyright: string | null;
  matchType?: 'title' | 'number' | 'lyrics' | null;
}

export type SongPartType = 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'coda';
export type SongSheetType = 'pdf' | 'image';

export interface SongPartDto {
  id: number;
  type: SongPartType;
  label: string;
  sortOrder: number;
  lyrics: string;
}

export interface SongSheetDto {
  id: number;
  key: string;
  type: SongSheetType;
  sortOrder: number;
}

export interface SongDto {
  id: number;
  number: number;
  title: string;
  author: string | null;
  copyright: string | null;
  songbook: { id: number; title: string; slug: string; language: string };
  parts: SongPartDto[];
  sheets: SongSheetDto[];
  createdAt: string;
  updatedAt: string;
}

export interface SongSearchResultDto {
  id: number;
  number: number;
  title: string;
  author: string | null;
  songbook: { id: number; title: string; slug: string };
}

export type TreasureType = 'book';

export interface TreasureDto {
  id: number;
  title: string;
  author: string | null;
  description: string | null;
  type: TreasureType;
  language: string;
  coverGradient: string | null;
  coverAccentColor: string | null;
  coverKey: string | null;
  isFree: boolean;
  price: string | null;
  sortOrder: number;
  epubUrl: string | null;
  epubKey: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Bible ─────────────────────────────────────────────────────────────────────
//
// Bible content comes from two kinds of source, behind one API contract:
//
//   `local`       — verse rows we host ourselves in the `sdarm-bible` D1
//                   (public-domain texts ingested by `scripts/bible/ingest.ts`)
//   `youversion`  — the YouVersion Platform API, proxied server-side by `apps/api`
//
// The operator-curated allowlist lives in Workers KV (config key
// `bible_translations`) as an ordered array of prefixed ids — `"loc:luther1912"`,
// `"yv:51"` — so the two sources cannot collide. A bare number is still read as
// `yv:{n}` for the pre-self-hosting allowlists.

/** Where a translation's verses come from. */
export type BibleSource = 'local' | 'youversion';

/**
 * Why we are allowed to serve this text.
 *
 * `public-domain` — the text's copyright has lapsed (our six ingested texts)
 * `permission`    — a rights holder granted us a license in writing
 * `provider`      — served under the terms of an upstream provider (YouVersion)
 */
export type BibleLicenseBasis = 'public-domain' | 'permission' | 'provider';

/**
 * What we may do with one translation's text, and what we must say about it.
 *
 * The gates are enforced in the API, never in the UI. A restriction that lives
 * in a component is a restriction that a projector, an OG card, a search index
 * or a mobile bundle will each forget separately.
 */
export interface BibleLicenseDto {
  basis: BibleLicenseBasis;
  /** Who holds the rights, e.g. 'Deutsche Bibelgesellschaft'. Null for PD texts. */
  rightsHolder: string | null;
  /**
   * The notice to render verbatim wherever this text is shown. Several licenses
   * require exact wording — do not reformat, truncate or translate it.
   */
  notice: string | null;
  /** Courtesy provenance for PD texts, e.g. 'Public domain. Text prepared from …'. */
  provenance: string | null;
  /** Bulk download of the text (offline bundles, export endpoints). */
  allowDownload: boolean;
  /** Storing a copy on a device for offline reading. */
  allowOffline: boolean;
  /** Inclusion in the full-text search index. */
  allowSearchIndex: boolean;
  /** Display on the projector / presenter display window. */
  allowProjector: boolean;
  /** Cap on verses returnable in one request; null = uncapped. */
  maxVersesPerRequest: number | null;
}

/**
 * Identity + license of one translation.
 *
 * `id` is prefixed and stable; `code` is the URL slug. Both are accepted
 * wherever a route takes a translation code.
 */
export interface BibleTranslationDto {
  /** Prefixed source id: 'loc:luther1912' or 'yv:51'. */
  id: string;
  source: BibleSource;
  /** URL slug used in /bible/{code}/… — 'luther1912', 'delut'. */
  code: string;
  /** Title in the translation's own language, e.g. 'Lutherbibel 1912'. */
  name: string;
  /** Abbreviation, e.g. 'LUT1912'. */
  abbreviation: string;
  /** BCP-47 short tag, e.g. 'de'. */
  language: string;
  /** Publication year; 0 when unknown. */
  year: number;
  /** True when the translation uses Septuagint Psalm numbering (see psalms.ts). */
  lxxPsalms: boolean;
  license: BibleLicenseDto;
}

/** Ingest state of a locally-hosted translation — Admin → Bible only. */
export interface BibleIngestStatusDto {
  verseCount: number;
  bookCount: number;
  /** ISO string, or null when the translation has never been ingested. */
  ingestedAt: string | null;
  /** Whether an offline bundle has been generated for this translation. */
  hasBundle: boolean;
}

export type BibleTestament = 'OT' | 'NT';

export interface BibleBookDto {
  id: number;
  /** USFM code: 'GEN', 'JHN', 'REV'. */
  code: string;
  number: number; // 1..66
  name: string; // in the translation's own language
  abbreviation: string;
  testament: BibleTestament;
  chapterCount: number;
}

export interface BibleVerseDto {
  verse: number;
  text: string;
}

/**
 * The translation identity carried alongside verse text.
 *
 * It embeds the whole license object rather than a bare copyright string so
 * that every surface receiving text also receives the notice it must render
 * and the gates it must respect — reader, parallel view, projector, OG card.
 */
export interface BibleTextTranslationDto {
  id: string;
  code: string;
  name: string;
  license: BibleLicenseDto;
}

export interface BibleChapterDto {
  translation: BibleTextTranslationDto;
  book: BibleBookDto;
  chapter: number;
  verses: BibleVerseDto[];
  /**
   * True when `license.maxVersesPerRequest` cut the chapter short. Null caps —
   * every public-domain text we host — never set it. It exists because a cap is
   * a license condition we must honour, and scripture that stops early without
   * saying so is worse than scripture that says it stopped.
   */
  truncated: boolean;
}

export interface ParallelVerseDto {
  verse: number;
  a: string | null; // null when this side has no verse N
  b: string | null;
}

export interface ParallelSideDto extends BibleTextTranslationDto {
  /** The chapter actually read on this side — differs across LXX/Hebrew Psalms. */
  chapter: number;
}

export interface ParallelChapterDto {
  bookCode: string;
  a: ParallelSideDto;
  b: ParallelSideDto;
  verses: ParallelVerseDto[];
}

/**
 * A translation as Admin → Bible sees it: the public shape plus the things only
 * the operator may know — whether it is currently served, how the ingest went,
 * and the paperwork behind a granted permission.
 */
export interface BibleAdminTranslationDto extends BibleTranslationDto {
  /** Whether the id appears in the KV allowlist, i.e. whether the public sees it. */
  enabled: boolean;
  sortOrder: number;
  /** Email thread, contract number — whatever proves the permission exists. */
  permissionRef: string | null;
  permissionDate: string | null;
  status: BibleIngestStatusDto;
}

/** One hit from the full-text search over locally-hosted translations. */
export interface BibleSearchHitDto {
  translationId: string;
  translationCode: string;
  book: string; // USFM code
  bookName: string;
  chapter: number;
  verse: number;
  /** Verse text with matched terms wrapped in <mark>…</mark>. */
  snippet: string;
}

/* ── Homepage bento grid ──────────────────────────────────────────────────
   The grid has exactly five blocks and no way to add a sixth: the column
   arithmetic (724 = 420+24+280 = 350+24+350) is what keeps the three columns
   ending on the same line, and an extra block would break it. So the config
   configures the five that exist rather than describing an arbitrary list. */

export type GridBlockId = 'plan' | 'verse' | 'invite' | 'book' | 'faith';

/** Fixed slots, in render order. Each block occupies exactly one. */
export const GRID_BLOCK_IDS: GridBlockId[] = ['plan', 'verse', 'invite', 'book', 'faith'];

export type GridScrim = 'none' | 'light' | 'medium' | 'strong';
export type GridTextColor = 'auto' | 'light' | 'dark';

export interface GridBlockText {
  label: string;
  title: string;
  button: string;
}

export interface GridBlockImage {
  /** R2 object key, or null when the block has no image. */
  key: string | null;
  /** Uploaded but not yet shown — lets an editor stage an image before using it. */
  enabled: boolean;
  /** CSS object-position, e.g. '58% 38%'. The card crops, so this decides what survives. */
  position: string;
  scrim: GridScrim;
  textColor: GridTextColor;
  /**
   * Mean luminance (0–1) of the lower third of the image, measured in the
   * browser at upload time. Stored so the site never has to sample pixels at
   * render time: doing that client-side repaints the text after the image
   * loads, which is a visible flash.
   */
  luminance: number | null;
}

export interface GridBlockConfig {
  visible: boolean;
  clickable: boolean;
  /** null = keep the block's built-in destination. */
  href: string | null;
  newTab: boolean;
  showLabel: boolean;
  showButton: boolean;
  text: { de: GridBlockText; en: GridBlockText };
  image: GridBlockImage;
}

export interface HomeGridConfig {
  blocks: Record<GridBlockId, GridBlockConfig>;
}

/* ── Grid config helpers ──────────────────────────────────────────────────
   Pure data logic, shared by the site that renders the grid and the admin
   that edits it. Neither app may import from the other, and duplicating a
   merge routine is how the two drift apart. */

/**
 * Defaults for the homepage grid.
 *
 * Every text field starts empty on purpose: empty means "use the translation",
 * so the German and English copy stays in the message files and the config only
 * carries what an editor has actually overridden. That keeps the two in sync by
 * default and makes "reset this field" mean deleting it rather than retyping a
 * translation.
 */
function defaultBlock(): GridBlockConfig {
  const empty: GridBlockText = { label: '', title: '', button: '' };
  return {
    visible: true,
    clickable: true,
    href: null,
    newTab: false,
    showLabel: true,
    showButton: true,
    text: { de: { ...empty }, en: { ...empty } },
    image: { key: null, enabled: false, position: '50% 50%', scrim: 'medium', textColor: 'auto', luminance: null },
  };
}

export function defaultGridConfig(): HomeGridConfig {
  const blocks = {} as Record<GridBlockId, GridBlockConfig>;
  for (const id of GRID_BLOCK_IDS) blocks[id] = defaultBlock();

  // The reading-plan card ships with its own photo and its own crop; the others
  // start without one.
  blocks.plan.image = { ...blocks.plan.image, enabled: true, position: '58% 38%', scrim: 'strong', textColor: 'light' };
  blocks.plan.newTab = true;
  // The verse card opens the share dialog rather than navigating.
  blocks.verse.clickable = false;
  blocks.verse.showLabel = false;
  blocks.verse.showButton = false;
  blocks.invite.showLabel = false;
  blocks.faith.showLabel = false;
  blocks.book.showButton = false;

  return { blocks };
}

const SCRIMS: GridScrim[] = ['none', 'light', 'medium', 'strong'];
const TEXT_COLORS: GridTextColor[] = ['auto', 'light', 'dark'];

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function mergeText(raw: unknown, base: GridBlockText): GridBlockText {
  const o = (raw ?? {}) as Record<string, unknown>;
  return { label: str(o.label, base.label), title: str(o.title, base.title), button: str(o.button, base.button) };
}

function mergeBlock(raw: unknown, base: GridBlockConfig): GridBlockConfig {
  const o = (raw ?? {}) as Record<string, unknown>;
  const text = (o.text ?? {}) as Record<string, unknown>;
  const img = (o.image ?? {}) as Record<string, unknown>;
  const luminance =
    typeof img.luminance === 'number' && img.luminance >= 0 && img.luminance <= 1 ? img.luminance : null;

  return {
    visible: bool(o.visible, base.visible),
    clickable: bool(o.clickable, base.clickable),
    href: typeof o.href === 'string' && o.href.trim() !== '' ? o.href : base.href,
    newTab: bool(o.newTab, base.newTab),
    showLabel: bool(o.showLabel, base.showLabel),
    showButton: bool(o.showButton, base.showButton),
    text: { de: mergeText(text.de, base.text.de), en: mergeText(text.en, base.text.en) },
    image: {
      key: typeof img.key === 'string' && img.key.trim() !== '' ? img.key : base.image.key,
      enabled: bool(img.enabled, base.image.enabled),
      position: str(img.position, base.image.position),
      scrim: SCRIMS.includes(img.scrim as GridScrim) ? (img.scrim as GridScrim) : base.image.scrim,
      textColor: TEXT_COLORS.includes(img.textColor as GridTextColor)
        ? (img.textColor as GridTextColor)
        : base.image.textColor,
      luminance: luminance ?? base.image.luminance,
    },
  };
}

/**
 * Merge a stored config onto the defaults. Anything missing, malformed or of
 * the wrong type falls back rather than throwing — a bad value in KV must not
 * be able to take the homepage down.
 */
export function parseGridConfig(raw: string | null | undefined): HomeGridConfig {
  const base = defaultGridConfig();
  if (!raw) return base;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return base;
  }
  if (!parsed || typeof parsed !== 'object') return base;

  const o = parsed as Record<string, unknown>;
  const blocks = (o.blocks ?? {}) as Record<string, unknown>;

  const merged = {} as Record<GridBlockId, GridBlockConfig>;
  for (const id of GRID_BLOCK_IDS) merged[id] = mergeBlock(blocks[id], base.blocks[id]);

  return { blocks: merged };
}

/** Config text wins when set; otherwise the translation does. */
export function pick(configured: string, translated: string): string {
  return configured.trim() !== '' ? configured : translated;
}

/**
 * Which text colour to paint over an image.
 *
 * 'auto' uses the luminance measured at upload — the lower third of the image
 * is what sits behind the text. Below the midpoint the photo is dark, so the
 * text goes light. With no measurement we assume light text, because every
 * scrim darkens rather than lightens.
 */
export function resolveTextColor(textColor: GridTextColor, luminance: number | null): 'light' | 'dark' {
  if (textColor !== 'auto') return textColor;
  if (luminance === null) return 'light';
  return luminance >= 0.5 ? 'dark' : 'light';
}

export * from './psalms';
