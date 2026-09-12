#!/usr/bin/env npx tsx
/**
 * Ingest the six public-domain Bible texts in `bible-data/` into chunked SQL
 * for `sdarm-bible` (see packages/db/src/bible.ts).
 *
 * This script only reads `bible-data/` and writes `scripts/bible/out/` — it
 * never touches a database itself. Applying the generated files is a separate
 * step; see scripts/bible/README.md for the local → staging → production flow.
 *
 * Usage:
 *   npx tsx scripts/bible/ingest.ts
 *   npx tsx scripts/bible/ingest.ts --only luther1912,kjv
 *   npx tsx scripts/bible/ingest.ts --data-dir bible-data --out-dir scripts/bible/out
 *
 * Run from the repo root — `--data-dir` and `--out-dir` are resolved against
 * the current working directory, same as the other scripts in this folder.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parseArgs } from 'util';

import { BIBLE_MANIFEST, type BibleManifestEntry } from './manifest';
import { BOOKS, USFM_ORDER, toUsfm, type BookMeta } from './usfm';
import { bookName } from './bookNames';

const { values } = parseArgs({
  options: {
    only: { type: 'string' },
    'data-dir': { type: 'string', default: 'bible-data' },
    'out-dir': { type: 'string', default: 'scripts/bible/out' },
  },
  strict: true,
});

const dataDir = values['data-dir']!;
const outDir = values['out-dir']!;
const only = values.only ? new Set(values.only.split(',').map((s) => s.trim())) : null;

/**
 * Byte budget for one multi-row INSERT.
 *
 * D1 rejects a SQL statement over 100 KB, and the limit is on bytes, not rows —
 * which is why this is a byte budget and not a row count. A flat 500 rows per
 * statement produced 140 KB statements for the Russian Synodal text, where
 * Cyrillic costs two UTF-8 bytes per character: it looked fine for the five
 * Latin-script translations and would have failed on apply for the sixth.
 */
const MAX_STATEMENT_BYTES = 48 * 1024;

/** USFM code -> book metadata, built once from usfm.ts's source-keyed table. */
const USFM_TO_META: Map<string, BookMeta> = new Map(Object.values(BOOKS).map((m) => [m.usfm, m]));

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlBool(value: boolean): string {
  return value ? '1' : '0';
}

interface ParsedVerse {
  book: string; // USFM code
  chapter: number;
  verse: number;
  text: string;
}

/** Parses one `bible-data/*.json` file. Aborts on any key the tables can't resolve. */
function parseSourceFile(path: string): ParsedVerse[] {
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as Record<string, string>;
  const verses: ParsedVerse[] = [];
  for (const [key, text] of Object.entries(raw)) {
    const parts = key.split('.');
    if (parts.length !== 3) {
      throw new Error(`Malformed key '${key}' in ${path} — expected 'Book.Chapter.Verse'.`);
    }
    const [sourceBook, chapterStr, verseStr] = parts;
    const meta = toUsfm(sourceBook); // throws loudly on an unmapped code
    const chapter = Number(chapterStr);
    const verse = Number(verseStr);
    if (!Number.isInteger(chapter) || !Number.isInteger(verse)) {
      throw new Error(`Malformed key '${key}' in ${path} — chapter/verse are not integers.`);
    }
    verses.push({ book: meta.usfm, chapter, verse, text });
  }
  return verses;
}

/**
 * Septuagint Psalm numbering is detected, never assumed: Psalm 119 (Hebrew) is
 * the 176-verse acrostic, and it sits at Psalm 118 under LXX numbering. See
 * packages/db/src/bible.ts and docs/gotchas.md for why this must be computed.
 */
function detectLxxPsalms(verses: ParsedVerse[]): boolean {
  const psalm118Verses = verses.filter((v) => v.book === 'PSA' && v.chapter === 118).length;
  return psalm118Verses === 176;
}

function chapterCounts(verses: ParsedVerse[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const v of verses) {
    const current = counts.get(v.book) ?? 0;
    if (v.chapter > current) counts.set(v.book, v.chapter);
  }
  return counts;
}

/** Groups pre-rendered value tuples into statements that stay under the byte budget. */
function groupByBytes(values: string[], maxBytes: number): string[][] {
  const out: string[][] = [];
  let current: string[] = [];
  let bytes = 0;
  for (const value of values) {
    const size = Buffer.byteLength(value, 'utf-8') + 4; // + the ",\n  " separator
    if (current.length > 0 && bytes + size > maxBytes) {
      out.push(current);
      current = [];
      bytes = 0;
    }
    current.push(value);
    bytes += size;
  }
  if (current.length > 0) out.push(current);
  return out;
}

function ingestOne(entry: BibleManifestEntry): void {
  const sourcePath = join(dataDir, entry.file);
  console.log(`\n[${entry.slug}] reading ${sourcePath}`);
  const verses = parseSourceFile(sourcePath);

  const booksFound = new Set(verses.map((v) => v.book));
  if (booksFound.size !== USFM_ORDER.length) {
    const missing = USFM_ORDER.filter((code) => !booksFound.has(code));
    const extra = [...booksFound].filter((code) => !USFM_ORDER.includes(code));
    throw new Error(
      `[${entry.slug}] expected ${USFM_ORDER.length} books, found ${booksFound.size}. ` +
        `Missing: ${missing.join(', ') || 'none'}. Extra: ${extra.join(', ') || 'none'}.`,
    );
  }

  const chapters = chapterCounts(verses);
  const lxxPsalms = detectLxxPsalms(verses);
  const verseCount = verses.length;
  const bookCount = booksFound.size;

  console.log(`[${entry.slug}] ${verseCount} verses, ${bookCount} books, lxxPsalms=${lxxPsalms}`);

  const targetDir = join(outDir, entry.slug);
  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(targetDir, { recursive: true });

  // 00 — delete this translation's existing rows, children first, so a re-run
  // (e.g. after a text correction) is safe to apply on top of a prior ingest.
  const deleteSql = [
    `DELETE FROM bible_verses_fts WHERE translation_id = ${sqlString(entry.id)};`,
    `DELETE FROM bible_verses WHERE translation_id = ${sqlString(entry.id)};`,
    `DELETE FROM bible_books WHERE translation_id = ${sqlString(entry.id)};`,
    `DELETE FROM bible_translations WHERE id = ${sqlString(entry.id)};`,
  ].join('\n');
  writeFileSync(join(targetDir, '00-delete.sql'), deleteSql + '\n');

  // 01 — the bible_translations row.
  const now = Math.floor(Date.now() / 1000);
  const translationCols = [
    'id',
    'source',
    'slug',
    'name',
    'abbreviation',
    'language',
    'year',
    'lxx_psalms',
    'sort_order',
    'license_basis',
    'rights_holder',
    'notice',
    'provenance',
    'permission_ref',
    'permission_date',
    'allow_download',
    'allow_offline',
    'allow_search_index',
    'allow_projector',
    'max_verses_per_request',
    'verse_count',
    'book_count',
    'ingested_at',
    'bundle_key',
    'created_at',
    'updated_at',
  ];
  const translationVals = [
    sqlString(entry.id),
    sqlString('local'),
    sqlString(entry.slug),
    sqlString(entry.name),
    sqlString(entry.abbreviation),
    sqlString(entry.language),
    String(entry.year),
    sqlBool(lxxPsalms),
    '0', // sort_order — left at the default; the KV allowlist order is what actually governs display order
    sqlString(entry.license.basis),
    'NULL', // rights_holder
    'NULL', // notice
    sqlString(entry.license.provenance),
    'NULL', // permission_ref
    'NULL', // permission_date
    sqlBool(entry.license.allowDownload),
    sqlBool(entry.license.allowOffline),
    sqlBool(entry.license.allowSearchIndex),
    sqlBool(entry.license.allowProjector),
    'NULL', // max_verses_per_request
    String(verseCount),
    String(bookCount),
    String(now),
    'NULL', // bundle_key
    String(now),
    String(now),
  ];
  writeFileSync(
    join(targetDir, '01-translation.sql'),
    `INSERT INTO bible_translations (${translationCols.join(', ')}) VALUES (${translationVals.join(', ')});\n`,
  );

  // 02 — the 66 bible_books rows, canonical Protestant order (see usfm.ts).
  const bookLines = USFM_ORDER.map((usfm) => {
    const meta = USFM_TO_META.get(usfm);
    if (!meta) throw new Error(`[${entry.slug}] no book metadata for '${usfm}' — this is a bug in usfm.ts.`);
    const names = bookName(entry.language, usfm);
    const chapterCount = chapters.get(usfm);
    if (!chapterCount) throw new Error(`[${entry.slug}] no chapters found for '${usfm}'.`);
    return (
      `INSERT INTO bible_books (translation_id, code, number, name, abbreviation, testament, chapter_count) ` +
      `VALUES (${sqlString(entry.id)}, ${sqlString(usfm)}, ${meta.number}, ${sqlString(names.name)}, ` +
      `${sqlString(names.abbreviation)}, ${sqlString(meta.testament)}, ${chapterCount});`
    );
  });
  writeFileSync(join(targetDir, '02-books.sql'), bookLines.join('\n') + '\n');

  // 03 / 04 — verses and FTS rows, chunked per book so no file is unwieldy.
  const versesByBook = new Map<string, ParsedVerse[]>();
  for (const v of verses) {
    if (!versesByBook.has(v.book)) versesByBook.set(v.book, []);
    versesByBook.get(v.book)!.push(v);
  }

  USFM_ORDER.forEach((usfm, idx) => {
    const bookNum = String(idx + 1).padStart(2, '0');
    const bookVerses = (versesByBook.get(usfm) ?? [])
      .slice()
      .sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);

    const verseValues = bookVerses.map(
      (v) => `(${sqlString(entry.id)}, ${sqlString(v.book)}, ${v.chapter}, ${v.verse}, ${sqlString(v.text)})`,
    );
    const verseStatements = groupByBytes(verseValues, MAX_STATEMENT_BYTES).map(
      (rows) => `INSERT INTO bible_verses (translation_id, book, chapter, verse, text) VALUES\n  ${rows.join(',\n  ')};`,
    );
    writeFileSync(join(targetDir, `03-verses-${bookNum}-${usfm}.sql`), verseStatements.join('\n\n') + '\n');

    // Skipped entirely when the license does not allow indexing — the ingest
    // is the enforcement point for `allowSearchIndex` on the write side; the
    // API route is the enforcement point on the read side (see BIBLE_SPEC.md).
    if (entry.license.allowSearchIndex) {
      const ftsValues = bookVerses.map(
        (v) => `(${sqlString(v.text)}, ${sqlString(entry.id)}, ${sqlString(v.book)}, ${v.chapter}, ${v.verse})`,
      );
      const ftsStatements = groupByBytes(ftsValues, MAX_STATEMENT_BYTES).map(
        (rows) => `INSERT INTO bible_verses_fts (text, translation_id, book, chapter, verse) VALUES\n  ${rows.join(',\n  ')};`,
      );
      writeFileSync(join(targetDir, `04-fts-${bookNum}-${usfm}.sql`), ftsStatements.join('\n\n') + '\n');
    }
  });

  console.log(`[${entry.slug}] wrote ${targetDir}`);
}

if (!existsSync(dataDir)) {
  throw new Error(`Data directory '${dataDir}' not found. Run from the repo root, or pass --data-dir.`);
}

const entries = only ? BIBLE_MANIFEST.filter((e) => only.has(e.slug)) : BIBLE_MANIFEST;
if (only) {
  const known = new Set(BIBLE_MANIFEST.map((e) => e.slug));
  const unknown = [...only].filter((s) => !known.has(s));
  if (unknown.length > 0) {
    throw new Error(`Unknown --only slug(s): ${unknown.join(', ')}. Known: ${[...known].join(', ')}.`);
  }
}

for (const entry of entries) {
  ingestOne(entry);
}

console.log(`\nDone. ${entries.length} translation(s) written to ${outDir}.`);
