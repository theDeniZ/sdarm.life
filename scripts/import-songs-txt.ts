#!/usr/bin/env npx tsx
/**
 * Import a plain-text German songbook (songs.txt format) into sdarm.life.
 *
 * Format: songs separated by "|" lines, each starting with "Lied Nr. <N>",
 * then title, then numbered verses with optional "Refrain:" blocks.
 *
 * Usage:
 *   npx tsx scripts/import-songs-txt.ts \
 *     --api-key <API_KEY> \
 *     --file songs.txt \
 *     --title "Zions Lieder" \
 *     --slug zions-lieder \
 *     --language de \
 *     [--api-url https://api.sdarm.life] \
 *     [--dry-run]
 */

import { readFileSync } from 'fs';
import { parseArgs } from 'util';

// ── CLI args ────────────────────────────────────────────────────────────────

const { values } = parseArgs({
  options: {
    'api-key': { type: 'string' },
    file: { type: 'string' },
    title: { type: 'string' },
    slug: { type: 'string' },
    language: { type: 'string', default: 'de' },
    'api-url': { type: 'string', default: 'https://api.sdarm.life' },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
  strict: true,
});

if (values.help) {
  console.log(`
Usage:
  npx tsx scripts/import-songs-txt.ts \\
    --api-key <key> --file <path.txt> \\
    --title "Songbook Title" --slug songbook-slug --language de \\
    [--api-url https://api.sdarm.life] [--dry-run]

Options:
  --api-key        API key (Bearer token) for admin API access (required)
  --file           Path to songs.txt file (required)
  --title          Songbook title (required)
  --slug           Songbook slug (required)
  --language       Language code (default: de)
  --api-url        API base URL (default: https://api.sdarm.life)
  --dry-run        Parse and validate without sending requests
`);
  process.exit(0);
}

const apiKey = values['api-key'];
const filePath = values.file;
const bookTitle = values.title;
const bookSlug = values.slug;
const language = values.language!;
const apiUrl = values['api-url']!;
const dryRun = values['dry-run']!;

if (!apiKey || !filePath || !bookTitle || !bookSlug) {
  console.error('Error: --api-key, --file, --title, and --slug are required. Use --help for usage.');
  process.exit(1);
}

// ── Types ───────────────────────────────────────────────────────────────────

interface ParsedSong {
  number: number;
  title: string;
  parts: { type: 'verse' | 'chorus'; label: string; lyrics: string }[];
}

// ── Parser ──────────────────────────────────────────────────────────────────

function parseSongs(text: string): ParsedSong[] {
  // Split on "|" separator lines
  const blocks = text.split(/^\|$/m).map((b) => b.trim()).filter(Boolean);
  const songs: ParsedSong[] = [];

  for (const block of blocks) {
    const lines = block.split('\n');

    // Find the last "Lied Nr." line (handles duplicated headers like song 271)
    let headerLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^Lied\s+Nr\.\s*\d+/.test(lines[i])) headerLineIdx = i;
    }
    if (headerLineIdx === -1) continue;

    const headerMatch = lines[headerLineIdx].match(/^Lied\s+Nr\.\s*(\d+)/)!;
    const number = parseInt(headerMatch[1], 10);

    // Next non-empty line is the title — but skip if it starts with "1." (no separate title)
    let titleIdx = headerLineIdx + 1;
    while (titleIdx < lines.length && !lines[titleIdx].trim()) titleIdx++;

    let title: string;
    const firstContent = titleIdx < lines.length ? lines[titleIdx].trim() : '';
    if (!firstContent || /^\d+\.\s+/.test(firstContent)) {
      // No separate title line — use first verse text or fallback
      title = firstContent.replace(/^\d+\.\s+/, '').replace(/,\s*$/, '') || `Lied ${number}`;
    } else {
      title = firstContent;
    }

    // Parse verses and refrains from remaining lines
    const parts: ParsedSong['parts'] = [];
    let currentType: 'verse' | 'chorus' | null = null;
    let currentLabel = '';
    let currentLines: string[] = [];
    let refrainLyrics: string | null = null;

    const flushPart = () => {
      if (currentType && currentLines.length > 0) {
        const lyrics = currentLines
          .map((l) => l.replace(/\s{2,}$/, '').replace(/^\s{1,3}/, ''))
          .join('\n');

        if (currentType === 'chorus') {
          // Only add refrain if we haven't seen identical content
          if (refrainLyrics === null) {
            refrainLyrics = lyrics;
            parts.push({ type: 'chorus', label: 'Refrain', lyrics });
          }
          // Skip duplicate refrains
        } else {
          parts.push({ type: 'verse', label: currentLabel, lyrics });
        }
      }
      currentType = null;
      currentLabel = '';
      currentLines = [];
    };

    for (let i = titleIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Verse start: "1. ...", "2. ...", etc.
      const verseMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (verseMatch) {
        flushPart();
        currentType = 'verse';
        currentLabel = verseMatch[1];
        if (verseMatch[2].trim()) currentLines.push(verseMatch[2]);
        continue;
      }

      // Refrain marker
      if (/^Refrain:\s*$/i.test(trimmed) || trimmed === 'Refrain:') {
        flushPart();
        currentType = 'chorus';
        currentLabel = 'Refrain';
        continue;
      }

      // Empty line within a part is fine (stanza spacing)
      if (!trimmed && currentType) {
        // Blank line between parts — don't flush yet, just skip
        continue;
      }

      // Content line
      if (trimmed && currentType) {
        currentLines.push(trimmed);
      }
    }

    flushPart();

    // If no parts were found, treat remaining non-empty lines as a single verse
    if (parts.length === 0) {
      const bodyLines = lines
        .slice(titleIdx + 1)
        .map((l) => l.trim())
        .filter(Boolean);
      if (bodyLines.length > 0) {
        parts.push({ type: 'verse', label: '1', lyrics: bodyLines.join('\n') });
      }
    }

    songs.push({ number, title, parts });
  }

  return songs;
}

// ── API helpers ─────────────────────────────────────────────────────────────

function adminHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
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

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const raw = readFileSync(filePath!, 'utf-8');
  const songs = parseSongs(raw);

  console.log(`Songbook: "${bookTitle}" (${bookSlug})`);
  console.log(`Language: ${language}`);
  console.log(`Songs parsed: ${songs.length}`);
  console.log(`API: ${apiUrl}`);
  console.log();

  if (dryRun) {
    console.log('[dry-run] Validating parsed songs…');
    let errors = 0;
    for (const s of songs) {
      if (!s.parts.length) {
        console.error(`  ✗ Lied Nr. ${s.number} "${s.title}" has no parts`);
        errors++;
      }
    }
    // Show a few samples
    for (const s of songs.slice(0, 3)) {
      console.log(`  #${s.number} "${s.title}" — ${s.parts.length} parts (${s.parts.map((p) => p.type).join(', ')})`);
    }
    console.log(`  … and ${songs.length - 3} more`);
    console.log(errors ? `\n${errors} error(s) found.` : '\nAll songs valid.');
    return;
  }

  // 1. Create the songbook
  console.log(`Creating songbook "${bookTitle}" (slug: ${bookSlug})…`);

  const songbook = await api<{ id: number }>('POST', '/songbooks', {
    title: bookTitle,
    slug: bookSlug,
    language,
    description: null,
  });

  console.log(`Songbook created (id: ${songbook.id})\n`);

  // 2. Import each song
  let imported = 0;
  let failed = 0;

  for (const song of songs) {
    const label = `#${song.number} "${song.title}"`;

    try {
      const created = await api<{ id: number }>('POST', '/songs', {
        songbookId: songbook.id,
        number: song.number,
        title: song.title,
      });

      for (let i = 0; i < song.parts.length; i++) {
        const part = song.parts[i];
        await api('POST', `/songs/${created.id}/parts`, {
          type: part.type,
          label: part.label,
          sortOrder: i,
          lyrics: part.lyrics,
        });
      }

      imported++;
      if (imported % 50 === 0) {
        console.log(`  … ${imported}/${songs.length} imported`);
      }
    } catch (err) {
      console.error(`  ✗ ${label}: ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log();
  console.log(`Done! ${imported} imported, ${failed} failed out of ${songs.length} songs.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
