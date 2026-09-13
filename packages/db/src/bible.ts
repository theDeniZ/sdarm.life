/**
 * Schema for `sdarm-bible` — a **second** D1 database, separate from `sdarm-db`.
 *
 * It exists for two reasons. It is created with `--location=weur` so the verse
 * rows sit in the EU (see docs/dsgvo.md on why that is a copyright posture, not
 * a GDPR one), and it keeps ~190k verse rows per six translations out of the
 * database the CMS runs on, where every unrelated query would scan past them.
 *
 * It is deliberately NOT re-exported from `./index.ts`: `pnpm generate` diffs
 * that file into `../migrations` for `sdarm-db`, so a re-export would emit
 * these tables into the wrong database's migrations. Import them as
 * `@sdarm/db/bible`, and generate with `pnpm generate:bible`.
 */
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const BIBLE_SOURCES = ['local', 'youversion'] as const;
export const BIBLE_LICENSE_BASES = ['public-domain', 'permission', 'provider'] as const;

/**
 * One row per translation the operator has ever configured — local and
 * YouVersion alike. A YouVersion row holds no verses; it exists so its license
 * record and gates can be edited in Admin → Bible like any other translation.
 *
 * `id` is the prefixed form (`loc:luther1912`, `yv:51`) that also appears in the
 * `bible_translations` KV allowlist. Presence here is not visibility: the KV
 * allowlist decides what the public routes serve.
 */
export const bibleTranslations = sqliteTable('bible_translations', {
  id:           text('id').primaryKey(),
  source:       text('source', { enum: BIBLE_SOURCES }).notNull(),
  /** URL slug — 'luther1912'. Unique across both sources. */
  slug:         text('slug').notNull().unique(),
  name:         text('name').notNull(),
  abbreviation: text('abbreviation').notNull(),
  /** BCP-47 short tag: 'de', 'en', 'ru', 'es'. */
  language:     text('language').notNull(),
  year:         integer('year').notNull().default(0),
  /**
   * Septuagint Psalm numbering. Computed at ingest from the verse data itself
   * (176 verses at Psalm 118), never taken on trust from the source file — a
   * wrong value aligns the wrong psalms in parallel mode and returns it as a
   * confident 200.
   */
  lxxPsalms:    integer('lxx_psalms', { mode: 'boolean' }).notNull().default(false),
  sortOrder:    integer('sort_order').notNull().default(0),

  // ── License record (see BibleLicenseDto in @sdarm/types) ──────────────────
  licenseBasis:        text('license_basis', { enum: BIBLE_LICENSE_BASES }).notNull(),
  rightsHolder:        text('rights_holder'),
  /** Rendered verbatim wherever the text is shown. Never reformat it. */
  notice:              text('notice'),
  provenance:          text('provenance'),
  /** Free-text reference to the permission: email thread, contract number. */
  permissionRef:       text('permission_ref'),
  permissionDate:      integer('permission_date', { mode: 'timestamp' }),
  allowDownload:       integer('allow_download',     { mode: 'boolean' }).notNull().default(false),
  allowOffline:        integer('allow_offline',      { mode: 'boolean' }).notNull().default(false),
  allowSearchIndex:    integer('allow_search_index', { mode: 'boolean' }).notNull().default(false),
  allowProjector:      integer('allow_projector',    { mode: 'boolean' }).notNull().default(true),
  /** Verses returnable in one request; null = uncapped. */
  maxVersesPerRequest: integer('max_verses_per_request'),

  // ── Ingest status (local only; 0/null for YouVersion rows) ────────────────
  verseCount:  integer('verse_count').notNull().default(0),
  bookCount:   integer('book_count').notNull().default(0),
  ingestedAt:  integer('ingested_at', { mode: 'timestamp' }),
  /** R2 key prefix of the generated offline bundle, or null when none exists. */
  bundleKey:   text('bundle_key'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (t) => [
  index('bible_translations_sort_order_idx').on(t.sortOrder),
]);

/**
 * Books of one translation. Written by the ingest script, which derives chapter
 * counts from the verses and takes the localized names from its own table —
 * the source JSON carries neither.
 *
 * `number` is the canonical Protestant order 1..66 for every translation, so
 * the OT/NT tabs and the book grid are stable across languages. The Synodal
 * text's own running order (Acts, then the catholic epistles, then Paul) is a
 * presentation of the same 66 books and is deliberately not preserved.
 */
export const bibleBooks = sqliteTable('bible_books', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  translationId: text('translation_id').notNull().references(() => bibleTranslations.id),
  /** USFM code: 'GEN', 'SNG', 'PHM', 'JHN'. */
  code:          text('code').notNull(),
  number:        integer('number').notNull(),
  name:          text('name').notNull(),
  abbreviation:  text('abbreviation').notNull(),
  testament:     text('testament', { enum: ['OT', 'NT'] }).notNull(),
  chapterCount:  integer('chapter_count').notNull(),
}, (t) => [
  index('bible_books_translation_idx').on(t.translationId, t.number),
  index('bible_books_lookup_idx').on(t.translationId, t.code),
]);

/**
 * The verses. ~31k rows per translation; a chapter read is ~30 rows off the
 * covering index.
 */
export const bibleVerses = sqliteTable('bible_verses', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  translationId: text('translation_id').notNull().references(() => bibleTranslations.id),
  book:          text('book').notNull(),
  chapter:       integer('chapter').notNull(),
  verse:         integer('verse').notNull(),
  text:          text('text').notNull(),
}, (t) => [
  index('bible_verses_ref_idx').on(t.translationId, t.book, t.chapter, t.verse),
]);
