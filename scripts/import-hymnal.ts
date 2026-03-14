#!/usr/bin/env npx tsx
/**
 * Import a hymnal JSON file into sdarm.life via the admin API.
 *
 * Usage:
 *   npx tsx scripts/import-hymnal.ts \
 *     --client-id <CF_CLIENT_ID> \
 *     --client-secret <CF_CLIENT_SECRET> \
 *     --file imnuri.json \
 *     [--api-url https://api.sdarm.life] \
 *     [--dry-run]
 */

import { readFileSync } from 'fs';
import { parseArgs } from 'util';

// ── CLI args ────────────────────────────────────────────────────────────────

const { values } = parseArgs({
  options: {
    'client-id': { type: 'string' },
    'client-secret': { type: 'string' },
    file: { type: 'string' },
    'api-url': { type: 'string', default: 'https://api.sdarm.life' },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
  strict: true,
});

if (values.help) {
  console.log(`
Usage:
  npx tsx scripts/import-hymnal.ts \\
    --client-id <id> --client-secret <secret> --file <path.json> \\
    [--api-url https://api.sdarm.life] [--dry-run]

Options:
  --client-id      CF-Access-Client-Id header value (required)
  --client-secret  CF-Access-Client-Secret header value (required)
  --file           Path to hymnal JSON file (required)
  --api-url        API base URL (default: https://api.sdarm.life)
  --dry-run        Parse and validate without sending requests
`);
  process.exit(0);
}

const clientId = values['client-id'];
const clientSecret = values['client-secret'];
const filePath = values.file;
const apiUrl = values['api-url']!;
const dryRun = values['dry-run']!;

if (!clientId || !clientSecret || !filePath) {
  console.error('Error: --client-id, --client-secret, and --file are required. Use --help for usage.');
  process.exit(1);
}

// ── Types ───────────────────────────────────────────────────────────────────

interface HymnalJson {
  lang: string;
  header: { title: string; subtitle?: string; abbr?: string };
  hymns: Hymn[];
}

interface Hymn {
  num: string;
  title: string;
  topic?: string;
  stanzas: {
    verses: string[][];
    refrain: string[];
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function adminHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'CF-Access-Client-Id': clientId!,
    'CF-Access-Client-Secret': clientSecret!,
  };
}

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${apiUrl}/api/v1/admin${path}`;
  const res = await fetch(url, {
    method,
    headers: adminHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatLyrics(lines: string[]): string {
  return lines.join('\n');
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const raw = readFileSync(filePath!, 'utf-8');
  const hymnal: HymnalJson = JSON.parse(raw);

  console.log(`Hymnal: "${hymnal.header.title}"`);
  console.log(`Language: ${hymnal.lang}`);
  console.log(`Songs: ${hymnal.hymns.length}`);
  console.log(`API: ${apiUrl}`);
  console.log();

  if (dryRun) {
    console.log('[dry-run] Validating hymnal structure…');
    let errors = 0;
    for (const h of hymnal.hymns) {
      if (!h.num || !h.title) {
        console.error(`  ✗ Hymn missing num/title: ${JSON.stringify(h).slice(0, 100)}`);
        errors++;
      }
      if (!h.stanzas?.verses?.length && !h.stanzas?.refrain?.length) {
        console.error(`  ✗ Hymn #${h.num} "${h.title}" has no verses or refrain`);
        errors++;
      }
    }
    console.log(errors ? `\n${errors} error(s) found.` : '\nAll hymns valid.');
    return;
  }

  // 1. Create the songbook
  const slug = hymnal.header.abbr ?? slugify(hymnal.header.title);
  console.log(`Creating songbook "${hymnal.header.title}" (slug: ${slug})…`);

  const songbook = await api<{ id: number }>('POST', '/songbooks', {
    title: hymnal.header.title,
    slug,
    language: hymnal.lang,
    description: hymnal.header.subtitle ?? null,
  });

  console.log(`Songbook created (id: ${songbook.id})\n`);

  // 2. Import each hymn
  let imported = 0;
  let failed = 0;

  for (const hymn of hymnal.hymns) {
    const num = parseInt(hymn.num, 10);
    const label = `#${hymn.num} "${hymn.title}"`;

    try {
      // Create the song
      const song = await api<{ id: number }>('POST', '/songs', {
        songbookId: songbook.id,
        number: num,
        title: hymn.title,
      });

      // Add verse parts
      let sortOrder = 0;
      for (let i = 0; i < hymn.stanzas.verses.length; i++) {
        await api('POST', `/songs/${song.id}/parts`, {
          type: 'verse',
          label: `${i + 1}`,
          sortOrder: sortOrder++,
          lyrics: formatLyrics(hymn.stanzas.verses[i]),
        });
      }

      // Add refrain (chorus) if present
      if (hymn.stanzas.refrain?.length) {
        await api('POST', `/songs/${song.id}/parts`, {
          type: 'chorus',
          label: 'Refren',
          sortOrder: sortOrder++,
          lyrics: formatLyrics(hymn.stanzas.refrain),
        });
      }

      imported++;
      if (imported % 50 === 0) {
        console.log(`  … ${imported}/${hymnal.hymns.length} imported`);
      }
    } catch (err) {
      console.error(`  ✗ ${label}: ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log();
  console.log(`Done! ${imported} imported, ${failed} failed out of ${hymnal.hymns.length} hymns.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
