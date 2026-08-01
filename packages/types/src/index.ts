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
  createdAt: string;
  updatedAt: string;
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
  eyebrow: { de: string; en: string };
  title: { de: string; en: string };
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

  return {
    eyebrow: { de: '', en: '' },
    title: { de: '', en: '' },
    blocks,
  };
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
  const eyebrow = (o.eyebrow ?? {}) as Record<string, unknown>;
  const title = (o.title ?? {}) as Record<string, unknown>;
  const blocks = (o.blocks ?? {}) as Record<string, unknown>;

  const merged = {} as Record<GridBlockId, GridBlockConfig>;
  for (const id of GRID_BLOCK_IDS) merged[id] = mergeBlock(blocks[id], base.blocks[id]);

  return {
    eyebrow: { de: str(eyebrow.de, base.eyebrow.de), en: str(eyebrow.en, base.eyebrow.en) },
    title: { de: str(title.de, base.title.de), en: str(title.en, base.title.en) },
    blocks: merged,
  };
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
