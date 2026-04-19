#!/usr/bin/env node
/**
 * Import treasures from epub-meta.json into the DB via the admin API.
 *
 * Usage:
 *   node scripts/import-treasures.mjs [--api-url <url>] [--api-key <key>]
 *
 * Defaults: api-url = http://localhost:8787/api/v1, api-key = dev
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const apiUrl = args[args.indexOf('--api-url') + 1] ?? 'http://localhost:8787/api/v1';
const apiKey = args[args.indexOf('--api-key') + 1] ?? 'dev';

const raw = JSON.parse(readFileSync(join(__dirname, 'de-books.json'), 'utf8'));

const valid = raw.filter((entry) => !entry.error && entry.title && entry.language);

const payload = valid.map((entry, i) => ({
  title: entry.title,
  author: entry.author ?? null,
  description: entry.description ?? null,
  type: 'book',
  language: entry.language,
  epubUrl: entry.url ?? null,
  sortOrder: i + 1,
  isFree: true,
}));

console.log(`Importing ${payload.length} treasures to ${apiUrl} …`);

const res = await fetch(`${apiUrl}/admin/treasures/batch`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify(payload),
});

if (!res.ok) {
  const text = await res.text();
  console.error(`Error ${res.status}: ${text}`);
  process.exit(1);
}

const result = await res.json();
console.log(`Done: ${result.created} treasures created.`);
