import { z } from '@hono/zod-openapi';

export const PostSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    slug: z.string(),
    excerpt: z.string().nullable(),
    body: z.string().nullable(),
    author: z.string().nullable(),
    videoUrl: z.string().nullable(),
    coverKey: z.string().nullable(),
    coverAlt: z.string().nullable(),
    thumbKey: z.string().nullable(),
    isFeatured: z.boolean(),
    publishedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    deletedAt: z.string().nullable(),
  })
  .openapi('Post');

export const ImageUsedInSchema = z.object({ type: z.string(), label: z.string() });

export const ImageSchema = z
  .object({
    key: z.string(),
    size: z.number(),
    uploaded: z.string(),
    usedIn: z.array(ImageUsedInSchema),
  })
  .openapi('Image');

export const SubscriberSchema = z
  .object({
    id: z.number(),
    email: z.string(),
    language: z.string(),
    confirmedAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .openapi('Subscriber');

export const OkSchema = z.object({ ok: z.literal(true) });
export const ErrorSchema = z.object({ error: z.string() });

export const ApiKeySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    prefix: z.string(),
    createdAt: z.string(),
    revokedAt: z.string().nullable(),
  })
  .openapi('ApiKey');

// ── Songbooks ─────────────────────────────────────────────────────────────────

export const SongbookSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    slug: z.string(),
    language: z.string(),
    description: z.string().nullable(),
    coverKey: z.string().nullable(),
    sortOrder: z.number(),
    songCount: z.number(),
  })
  .openapi('Songbook');

export const SongListItemSchema = z
  .object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    author: z.string().nullable(),
    copyright: z.string().nullable(),
    matchType: z.enum(['title', 'number', 'lyrics']).nullable().optional(),
  })
  .openapi('SongListItem');

export const SongSearchResultSchema = z
  .object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    author: z.string().nullable(),
    songbook: z.object({ id: z.number(), title: z.string(), slug: z.string() }),
  })
  .openapi('SongSearchResult');

export const SongPartTypeSchema = z.enum(['verse', 'chorus', 'bridge', 'intro', 'outro', 'coda']);
export const SongSheetTypeSchema = z.enum(['pdf', 'image']);
export const TranslationTypeSchema = z.enum(['original', 'singable', 'reference']);

export const SongPartSchema = z
  .object({
    id: z.number(),
    type: SongPartTypeSchema,
    label: z.string(),
    sortOrder: z.number(),
    lyrics: z.string(),
    language: z.string().nullable(),
    translationType: TranslationTypeSchema.nullable(),
  })
  .openapi('SongPart');

export const SongSheetSchema = z
  .object({
    id: z.number(),
    key: z.string(),
    type: SongSheetTypeSchema,
    sortOrder: z.number(),
  })
  .openapi('SongSheet');

export const SongSchema = z
  .object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    author: z.string().nullable(),
    copyright: z.string().nullable(),
    songbook: z.object({ id: z.number(), title: z.string(), slug: z.string(), language: z.string() }),
    parts: z.array(SongPartSchema),
    sheets: z.array(SongSheetSchema),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('Song');

// ── Treasures ─────────────────────────────────────────────────────────────────

export const TreasureTypeSchema = z.enum(['book']);

export const TreasureSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    author: z.string().nullable(),
    description: z.string().nullable(),
    type: TreasureTypeSchema,
    language: z.string(),
    coverGradient: z.string().nullable(),
    coverAccentColor: z.string().nullable(),
    coverKey: z.string().nullable(),
    isFree: z.boolean(),
    price: z.string().nullable(),
    sortOrder: z.number(),
    epubUrl: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('Treasure');

// ── Bible (YouVersion-backed, see services/bible/) ────────────────────────────

export const BibleTestamentSchema = z.enum(['OT', 'NT']);

export const BibleTranslationSchema = z
  .object({
    id: z.number().openapi({ description: 'YouVersion Bible ID', example: 51 }),
    code: z.string().openapi({ description: 'URL slug', example: 'delut' }),
    name: z.string(),
    abbreviation: z.string(),
    language: z.string(),
    copyright: z.string().nullable(),
    year: z.number(),
    lxxPsalms: z.boolean().openapi({ description: 'Uses Septuagint Psalm numbering' }),
  })
  .openapi('BibleTranslation');

export const BibleCatalogEntrySchema = z
  .object({
    id: z.number(),
    code: z.string(),
    name: z.string(),
    abbreviation: z.string(),
    language: z.string(),
    copyright: z.string().nullable(),
    licensed: z.boolean().openapi({
      description: 'Whether our app key has agreed to a license covering this Bible. Unlicensed Bibles appear only on an all_available listing and cannot be read.',
    }),
  })
  .openapi('BibleCatalogEntry');

export const BibleLicenseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    organization: z.string().nullable(),
    bibleIds: z.array(z.number()).openapi({ description: 'Every Bible ID this license governs' }),
  })
  .openapi('BibleLicense');

export const BibleBookSchema = z
  .object({
    id: z.number(),
    code: z.string().openapi({ description: 'USFM code', example: 'JHN' }),
    number: z.number(),
    name: z.string(),
    abbreviation: z.string(),
    testament: BibleTestamentSchema,
    chapterCount: z.number(),
  })
  .openapi('BibleBook');

export const BibleVerseSchema = z.object({ verse: z.number(), text: z.string() }).openapi('BibleVerse');

export const BibleChapterSchema = z
  .object({
    translation: z.object({ code: z.string(), name: z.string(), copyright: z.string().nullable() }),
    book: BibleBookSchema,
    chapter: z.number(),
    verses: z.array(BibleVerseSchema),
  })
  .openapi('BibleChapter');

export const ParallelVerseSchema = z
  .object({ verse: z.number(), a: z.string().nullable(), b: z.string().nullable() })
  .openapi('ParallelVerse');

const ParallelSideSchema = z.object({
  code: z.string(),
  name: z.string(),
  chapter: z.number(),
  copyright: z.string().nullable(),
});

export const ParallelChapterSchema = z
  .object({
    bookCode: z.string(),
    a: ParallelSideSchema,
    b: ParallelSideSchema,
    verses: z.array(ParallelVerseSchema),
  })
  .openapi('ParallelChapter');

export const PaginationQuery = z.object({
  limit: z.coerce.number().optional().openapi({ example: 20 }),
  offset: z.coerce.number().optional().openapi({ example: 0 }),
});

export function listOf<T extends z.ZodTypeAny>(schema: T) {
  return z.object({ items: z.array(schema), total: z.number() });
}
