/**
 * Resolves the operator-curated set of Bible translations, across both sources.
 *
 * Two things back a translation's text: verse rows in the `sdarm-bible` D1
 * (`local.ts`) and the YouVersion Platform API (`youversion.ts`). This module is
 * the single entry point the routes call; it decides which provider serves a
 * given translation from the prefix of its id and returns the same DTOs either
 * way, so nothing above this layer knows the difference.
 *
 * The persisted state is still just the `bible_translations` config key in
 * Workers KV — now an ordered array of prefixed ids — plus, for whatever rows
 * exist, the license record in `sdarm-bible`.
 */
import type {
  BibleBookDto,
  BibleChapterDto,
  BibleLicenseDto,
  BibleSearchHitDto,
  BibleTextTranslationDto,
  BibleTranslationDto,
  ParallelChapterDto,
} from '@sdarm/types';
import { resolveParallelPsalmChapters } from '@sdarm/types';
import type { Bindings } from '../../types';
import { BIBLE_TTL, kvKey, withCache } from './cache';
import * as local from './local';
import * as yv from './youversion';

export type Translation = BibleTranslationDto;

// ── Prefixed ids ──────────────────────────────────────────────────────────────

/**
 * Normalise one allowlist entry to a prefixed id.
 *
 * A bare number — `51`, or `"51"` — is a pre-self-hosting allowlist entry and
 * reads as `yv:51`. Anything else must carry its own prefix, because an
 * unprefixed slug would be ambiguous the moment a local translation and a
 * YouVersion one share an abbreviation.
 */
export function parseTranslationId(raw: unknown): string | null {
  if (typeof raw === 'number') return Number.isInteger(raw) && raw > 0 ? `yv:${raw}` : null;
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (s === '') return null;
  if (/^\d+$/.test(s)) return Number(s) > 0 ? `yv:${Number(s)}` : null;
  if (/^loc:[a-z0-9][a-z0-9-]*$/i.test(s)) return s;
  if (/^yv:\d+$/.test(s)) return s;
  return null;
}

export function isLocalId(id: string): boolean {
  return id.startsWith('loc:');
}

/** The YouVersion numeric id behind a `yv:` id. */
function yvNumber(id: string): number {
  return Number(id.slice(3));
}

/** The enabled translation ids, in the order the operator configured them. */
export async function getEnabledIds(env: Bindings): Promise<string[]> {
  try {
    const config = await env.KV.get<Record<string, string | null>>('config', 'json');
    const raw = config?.bible_translations;
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const ids = parsed.map(parseTranslationId).filter((id): id is string => id !== null);
    return [...new Set(ids)];
  } catch {
    return [];
  }
}

// ── License records ───────────────────────────────────────────────────────────

/**
 * What a YouVersion translation is allowed to do when no row exists for it.
 *
 * Deliberately the restrictive end: we serve that text under someone else's
 * terms, so bulk download, offline copies and a search index we build over it
 * are all off until an operator decides otherwise in Admin → Bible. The notice
 * is YouVersion's own copyright string, which several per-Bible licenses
 * require us to render verbatim.
 */
function providerLicense(copyright: string | null): BibleLicenseDto {
  return {
    basis: 'provider',
    rightsHolder: null,
    notice: copyright,
    provenance: null,
    allowDownload: false,
    allowOffline: false,
    allowSearchIndex: false,
    allowProjector: true,
    maxVersesPerRequest: null,
  };
}

function textIdentity(t: Translation): BibleTextTranslationDto {
  return { id: t.id, code: t.code, name: t.name, license: t.license };
}

// ── Loading ───────────────────────────────────────────────────────────────────

/**
 * Full metadata for one enabled YouVersion translation. Two cached calls: the
 * Bible record (title/abbreviation/copyright) and the books payload, which is
 * also where the LXX-Psalm flag is detected.
 *
 * A missing books payload fails the whole translation rather than defaulting
 * `lxxPsalms` to `false`. Defaulting would describe a Septuagint-numbered Bible
 * as Hebrew-numbered, and parallel mode would then align Psalm 23 against the
 * wrong psalm and return it as a confident 200 — edge-cached for a day. Dropping
 * the translation instead surfaces as the reader's unavailable state, which is
 * recoverable; silently wrong scripture is not.
 */
async function loadYouVersion(
  env: Bindings,
  id: number,
  record: local.TranslationRecord | undefined,
): Promise<Translation | null> {
  const [bible, books] = await Promise.all([
    withCache(env, kvKey.bible(id), BIBLE_TTL.bible, () => yv.getBible(env, id)),
    withCache(env, kvKey.books(id), BIBLE_TTL.books, () => yv.getBooks(env, id)),
  ]);
  if (!bible || !books) return null;
  return {
    id: `yv:${bible.id}`,
    source: 'youversion',
    code: record?.slug ?? bible.code,
    name: record?.name ?? bible.name,
    abbreviation: record?.abbreviation ?? bible.abbreviation,
    language: record?.language ?? bible.language,
    year: record?.year ?? parseYearFromName(bible.name),
    lxxPsalms: books.lxxPsalms,
    license: record ? local.licenseOf(record) : providerLicense(bible.copyright),
  };
}

function fromRecord(r: local.TranslationRecord): Translation {
  return {
    id: r.id,
    source: r.source,
    code: r.slug,
    name: r.name,
    abbreviation: r.abbreviation,
    language: r.language,
    year: r.year,
    lxxPsalms: r.lxxPsalms,
    license: local.licenseOf(r),
  };
}

function parseYearFromName(name: string): number {
  const m = name.match(/\b(1[4-9]\d{2}|20\d{2})\b/);
  return m ? Number(m[1]) : 0;
}

/** All enabled translations, in the order the operator configured them. */
export async function listTranslations(env: Bindings): Promise<Translation[]> {
  const ids = await getEnabledIds(env);
  if (ids.length === 0) return [];

  // One query for the whole enabled set, not one per translation.
  const records = await local.getRecords(env, ids);

  const rows = await Promise.all(
    ids.map(async (id) => {
      const record = records.get(id);
      // A local id with no row has no verses either — nothing to serve.
      if (isLocalId(id)) return record ? fromRecord(record) : null;
      return loadYouVersion(env, yvNumber(id), record);
    }),
  );
  return rows.filter((r): r is Translation => r !== null);
}

/**
 * Resolve a URL code to an enabled translation. Accepts the slug, the prefixed
 * id, or — for YouVersion translations — the raw numeric ID, so links survive
 * an abbreviation change upstream.
 */
export async function resolveTranslation(env: Bindings, code: string): Promise<Translation | null> {
  const all = await listTranslations(env);
  const byCode = all.find((t) => t.code === code);
  if (byCode) return byCode;
  const asId = parseTranslationId(code);
  return asId ? (all.find((t) => t.id === asId) ?? null) : null;
}

export async function listBooks(env: Bindings, translation: Translation): Promise<BibleBookDto[]> {
  if (translation.source === 'local') return local.listBooks(env, translation.id);
  const id = yvNumber(translation.id);
  const payload = await withCache(env, kvKey.books(id), BIBLE_TTL.books, () => yv.getBooks(env, id));
  return payload?.books ?? [];
}

/**
 * Apply the license's per-request verse cap.
 *
 * A cap is a license condition, so it is enforced here rather than left to a
 * caller: every surface that reads a chapter — reader, projector, parallel view,
 * OG card — goes through this function. `truncated` exists because scripture
 * that stops early without saying so is worse than scripture that says it
 * stopped.
 */
function applyCap(
  verses: { verse: number; text: string }[],
  cap: number | null,
): { verses: { verse: number; text: string }[]; truncated: boolean } {
  if (cap === null || cap <= 0 || verses.length <= cap) return { verses, truncated: false };
  return { verses: verses.slice(0, cap), truncated: true };
}

export async function getChapter(
  env: Bindings,
  translation: Translation,
  bookCode: string,
  chapter: number,
): Promise<BibleChapterDto | null> {
  const books = await listBooks(env, translation);
  const book = books.find((b) => b.code === bookCode.toUpperCase());
  if (!book) return null;
  if (chapter < 1 || chapter > book.chapterCount) return null;

  const raw =
    translation.source === 'local'
      ? await local.getChapterVerses(env, translation.id, book.code, chapter)
      : await withCache(env, kvKey.chapter(yvNumber(translation.id), book.code, chapter), BIBLE_TTL.chapter, () =>
          yv.getChapterVerses(env, yvNumber(translation.id), book.code, chapter),
        );
  if (!raw) return null;

  const { verses, truncated } = applyCap(raw, translation.license.maxVersesPerRequest);
  return { translation: textIdentity(translation), book, chapter, verses, truncated };
}

export async function getParallelChapter(
  env: Bindings,
  a: Translation,
  b: Translation,
  bookCode: string,
  chapter: number,
): Promise<ParallelChapterDto | null> {
  // Psalms are numbered differently between LXX and Hebrew traditions; map the
  // B side so both columns show the same psalm.
  const { chapterA, chapterB } = resolveParallelPsalmChapters(a.lxxPsalms, b.lxxPsalms, bookCode.toUpperCase(), chapter);
  const [chA, chB] = await Promise.all([getChapter(env, a, bookCode, chapterA), getChapter(env, b, bookCode, chapterB)]);
  if (!chA || !chB) return null;

  const merged = new Map<number, { verse: number; a: string | null; b: string | null }>();
  for (const v of chA.verses) merged.set(v.verse, { verse: v.verse, a: v.text, b: null });
  for (const v of chB.verses) {
    const existing = merged.get(v.verse);
    if (existing) existing.b = v.text;
    else merged.set(v.verse, { verse: v.verse, a: null, b: v.text });
  }

  // Each side went through `getChapter`, so each side's own cap has already been
  // applied. `ParallelChapterDto` carries no `truncated` flag to report it with.
  return {
    bookCode: chA.book.code,
    a: { ...textIdentity(a), chapter: chapterA },
    b: { ...textIdentity(b), chapter: chapterB },
    verses: [...merged.values()].sort((x, y) => x.verse - y.verse),
  };
}

// ── Search ────────────────────────────────────────────────────────────────────

/**
 * Full-text search over the locally-hosted translations.
 *
 * Only local ones: there is no YouVersion search endpoint we may build an index
 * from, and `allowSearchIndex` is false for provider-sourced text by default in
 * any case. The caller has already decided which translations are eligible.
 */
export async function search(
  env: Bindings,
  opts: { q: string; translations: Translation[]; book?: string; limit: number; offset: number },
): Promise<{ items: BibleSearchHitDto[]; total: number }> {
  const eligible = opts.translations.filter((t) => t.source === 'local' && t.license.allowSearchIndex);
  if (eligible.length === 0) return { items: [], total: 0 };

  const { items, total } = await local.search(env, {
    q: opts.q,
    translationIds: eligible.map((t) => t.id),
    book: opts.book,
    limit: opts.limit,
    offset: opts.offset,
  });

  // Book names come from the translation's own book list, which is already
  // loaded per translation for the chapter routes and is cheap here.
  const byId = new Map(eligible.map((t) => [t.id, t]));
  const bookNames = new Map<string, Map<string, string>>();
  await Promise.all(
    eligible.map(async (t) => {
      const books = await listBooks(env, t);
      bookNames.set(t.id, new Map(books.map((b) => [b.code, b.name])));
    }),
  );

  return {
    items: items.map((h) => ({
      translationId: h.translationId,
      translationCode: byId.get(h.translationId)?.code ?? h.translationId,
      book: h.book,
      bookName: bookNames.get(h.translationId)?.get(h.book) ?? h.book,
      chapter: h.chapter,
      verse: h.verse,
      snippet: h.snippet,
    })),
    total,
  };
}
