#!/usr/bin/env node
/**
 * Convert VPL (Verse Per Line) Bible sources to D1-ready SQL.
 *
 * Reads:
 *   scripts/bible-data/{russyn,deu1912,deu1951,eng-kjv2006}_vpl/<same>_vpl.txt
 * Writes:
 *   scripts/bible-data/<code>.sql
 *   scripts/bible-data/all.sql
 *
 * Apply with:
 *   pnpm wrangler d1 execute sdarm-db --config apps/api/wrangler.jsonc --file=scripts/bible-data/all.sql
 *   pnpm wrangler d1 execute sdarm-db --remote --config apps/api/wrangler.jsonc --file=scripts/bible-data/all.sql
 *
 * Idempotent: all.sql wipes type='bible' treasures (cascades to bible_*) before reinserting.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { BOOK_CODES, BOOK_NUMBER, BOOK_TESTAMENT, BOOK_NAMES } from './bible-data/book-names.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, 'bible-data');

const TRANSLATIONS = [
  {
    dir: 'russyn_vpl',
    file: 'russyn_vpl.txt',
    code: 'synodal',
    name: 'Синодальный перевод',
    description: 'Russian Synodal Bible, 1876',
    language: 'ru',
    year: 1876,
    copyright: null,
    license: 'public-domain',
  },
  {
    dir: 'deu1912_vpl',
    file: 'deu1912_vpl.txt',
    code: 'luther1912',
    name: 'Luther 1912',
    description: 'German Lutherbibel, 1912 revision',
    language: 'de',
    year: 1912,
    copyright: null,
    license: 'public-domain',
  },
  {
    dir: 'eng-kjv2006_vpl',
    file: 'eng-kjv2006_vpl.txt',
    code: 'kjv',
    name: 'King James Version',
    description: 'English King James Version, 1611 (2006 reprint)',
    language: 'en',
    year: 1611,
    copyright: null,
    license: 'public-domain',
  },
];

const VPL_LINE = /^([A-Z0-9]{3}) (\d+):(\d+) (.*)$/;
const sqlEscape = (s) => String(s).replace(/'/g, "''");

function parseVpl(filePath, t) {
  const raw = readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const books = new Map(); // code → { chapters: Map<chapter, [{verse, text}, ...]> }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const m = line.match(VPL_LINE);
    if (!m) {
      throw new Error(`${t.code}: line ${i + 1}: malformed VPL: "${line.slice(0, 80)}…"`);
    }
    const [, bookCode, chStr, vStr, text] = m;
    if (!BOOK_TESTAMENT[bookCode]) {
      throw new Error(`${t.code}: line ${i + 1}: unknown book code "${bookCode}"`);
    }
    if (!books.has(bookCode)) books.set(bookCode, new Map());
    const chapters = books.get(bookCode);
    const chapter = parseInt(chStr, 10);
    const verse = parseInt(vStr, 10);
    if (!chapters.has(chapter)) chapters.set(chapter, []);
    chapters.get(chapter).push({ verse, text: text.trim() });
  }

  // Validate: 66 books, no orphan codes
  const present = [...books.keys()];
  const missing = BOOK_CODES.filter((c) => !present.includes(c));
  if (missing.length) throw new Error(`${t.code}: missing books: ${missing.join(', ')}`);
  const extra = present.filter((c) => !BOOK_CODES.includes(c));
  if (extra.length) throw new Error(`${t.code}: unknown books: ${extra.join(', ')}`);

  return books;
}

function buildSql(t, parsedBooks) {
  const lines = [];
  const title       = sqlEscape(t.name);
  const description = sqlEscape(t.description);
  const lang        = sqlEscape(t.language);
  const code        = sqlEscape(t.code);
  const copyright   = t.copyright == null ? 'NULL' : `'${sqlEscape(t.copyright)}'`;
  const license     = sqlEscape(t.license);
  // Negative sort_order keeps all Bible translations grouped at the very top of
  // the treasures catalogue, before any book (regular books start at sort_order=1).
  const sortOrder = -100 + TRANSLATIONS.findIndex((x) => x.code === t.code);

  lines.push(`-- === Translation: ${t.name} (${t.code}) ===`);
  lines.push(
    `INSERT INTO treasures (title, author, description, type, language, is_free, sort_order, created_at, updated_at) ` +
    `VALUES ('${title}', NULL, '${description}', 'bible', '${lang}', 1, ${sortOrder}, unixepoch(), unixepoch());`
  );
  lines.push(
    `INSERT INTO bible_translations (treasure_id, code, year, copyright, license) ` +
    `SELECT id, '${code}', ${t.year}, ${copyright}, '${license}' FROM treasures WHERE type = 'bible' AND title = '${title}';`
  );

  // Books — one big CTE INSERT for all 66
  const bookValues = BOOK_CODES.map((bc) => {
    const meta = BOOK_NAMES[t.language][bc];
    if (!meta) throw new Error(`${t.code}: no name in ${t.language} for book ${bc}`);
    const chapters = parsedBooks.get(bc);
    const chapterCount = chapters.size;
    return `('${sqlEscape(bc)}', ${BOOK_NUMBER[bc]}, '${sqlEscape(meta.name)}', '${sqlEscape(meta.abbreviation)}', '${BOOK_TESTAMENT[bc]}', ${chapterCount})`;
  }).join(',\n  ');

  lines.push(`-- 66 books`);
  lines.push(
    `WITH b(code, number, name, abbreviation, testament, chapter_count) AS (VALUES\n  ${bookValues}\n)\n` +
    `INSERT INTO bible_books (translation_id, code, number, name, abbreviation, testament, chapter_count) ` +
    `SELECT bt.id, b.code, b.number, b.name, b.abbreviation, b.testament, b.chapter_count ` +
    `FROM b CROSS JOIN bible_translations bt WHERE bt.code = '${code}';`
  );

  // Verses — one CTE INSERT per chapter
  let chapterCount = 0;
  let verseCount = 0;
  for (const bc of BOOK_CODES) {
    const chapters = [...parsedBooks.get(bc).entries()].sort((a, b) => a[0] - b[0]);
    for (const [chapter, verses] of chapters) {
      const sorted = verses.sort((a, b) => a.verse - b.verse);
      const verseValues = sorted
        .map((v) => `(${chapter}, ${v.verse}, '${sqlEscape(v.text)}')`)
        .join(',\n  ');
      lines.push(
        `WITH v(chapter, verse, text) AS (VALUES\n  ${verseValues}\n)\n` +
        `INSERT INTO bible_verses (book_id, chapter, verse, text) ` +
        `SELECT bb.id, v.chapter, v.verse, v.text ` +
        `FROM v CROSS JOIN bible_books bb JOIN bible_translations bt ON bt.id = bb.translation_id ` +
        `WHERE bt.code = '${code}' AND bb.code = '${sqlEscape(bc)}';`
      );
      chapterCount++;
      verseCount += sorted.length;
    }
  }

  return { sql: lines.join('\n') + '\n', chapterCount, verseCount };
}

const cleanup = `-- === Cleanup (cascades through bible_translations → bible_books → bible_verses) ===
DELETE FROM treasures WHERE type = 'bible';
`;

let allSql = cleanup;
let totalChapters = 0;
let totalVerses = 0;

for (const t of TRANSLATIONS) {
  const path = join(dataDir, t.dir, t.file);
  if (!existsSync(path)) {
    console.error(`✗ Missing: ${path}`);
    console.error(`  Unzip ${t.dir}.zip into scripts/bible-data/${t.dir}/, then re-run.`);
    process.exit(1);
  }

  const parsed = parseVpl(path, t);
  const { sql, chapterCount, verseCount } = buildSql(t, parsed);

  const outFile = join(dataDir, `${t.code}.sql`);
  writeFileSync(outFile, sql);
  console.log(`✓ ${t.code.padEnd(15)} → ${chapterCount} chapters, ${verseCount} verses → ${outFile}`);

  allSql += '\n' + sql;
  totalChapters += chapterCount;
  totalVerses   += verseCount;
}

const allFile = join(dataDir, 'all.sql');
writeFileSync(allFile, allSql);
console.log('');
console.log(`✓ all.sql        → ${totalChapters} chapters, ${totalVerses} verses → ${allFile}`);
console.log('');
console.log(`Apply locally:`);
console.log(`  pnpm wrangler d1 execute sdarm-db --config apps/api/wrangler.jsonc --file=scripts/bible-data/all.sql`);
console.log(`Apply to production:`);
console.log(`  pnpm wrangler d1 execute sdarm-db --remote --config apps/api/wrangler.jsonc --file=scripts/bible-data/all.sql`);
