/**
 * Extract metadata from a list of EPUB URLs and write JSON.
 *
 * Usage (from repo root):
 *   node scripts/extract-epub-meta.mjs > scripts/epub-meta.json
 *
 * Reads:  scripts/epub.txt  (one URL per line)
 * Writes: JSON array to stdout, progress to stderr
 */

import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const JSZip = require('jszip');

const __dir = dirname(fileURLToPath(import.meta.url));
const urls = readFileSync(resolve(__dir, 'epub.txt'), 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean);

// ── Epub helpers ──────────────────────────────────────────────────────────────

function resolveEpubPath(base, relative) {
  if (relative.startsWith('/')) return relative.slice(1);
  const parts = base.split('/').slice(0, -1);
  for (const seg of relative.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

function dcText(doc, tag) {
  return (
    doc
      .querySelectorAll?.(`metadata > *`)
      // querySelectorAll not available in Node — use manual search below
      ?.map((el) => (el.localName === tag ? el.textContent?.trim() : null))
      ?.find(Boolean) ?? null
  );
}

// Minimal XML → flat tag map (no DOM needed)
function extractDcFields(opfXml) {
  const fields = {};
  const tags = ['title', 'creator', 'description', 'language', 'subject'];
  for (const tag of tags) {
    const re = new RegExp(`<dc:${tag}[^>]*>([\\s\\S]*?)<\\/dc:${tag}>`, 'i');
    const m = opfXml.match(re);
    if (m) fields[tag] = m[1].replace(/\s+/g, ' ').trim();
  }
  return fields;
}

async function fetchEpubMeta(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await res.arrayBuffer();

  const zip = await JSZip.loadAsync(buf);

  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) throw new Error('No container.xml');

  const opfPath = containerXml.match(/full-path="([^"]+)"/)?.[1];
  if (!opfPath) throw new Error('No OPF path');

  const opfXml = await zip.file(opfPath)?.async('text');
  if (!opfXml) throw new Error(`No OPF at ${opfPath}`);

  return extractDcFields(opfXml);
}

// ── Main ───────────────────────────────────────────────────────────────────────

const results = [];

for (let i = 0; i < urls.length; i++) {
  const url = urls[i];
  const label = url.split('/').pop();
  process.stderr.write(`[${i + 1}/${urls.length}] ${label} … `);

  try {
    const meta = await fetchEpubMeta(url);
    results.push({
      url,
      title: meta.title ?? null,
      author: meta.creator ?? null,
      description: meta.description ?? null,
      language: meta.language ?? null,
      subject: meta.subject ?? null,
    });
    process.stderr.write(`✓ ${meta.title ?? '(no title)'}\n`);
  } catch (err) {
    results.push({ url, error: err.message });
    process.stderr.write(`✗ ${err.message}\n`);
  }
}

process.stdout.write(JSON.stringify(results, null, 2) + '\n');
