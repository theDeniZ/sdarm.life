import type { SongDto, SongListItemDto, SongSearchResultDto, SongbookDto } from '@sdarm/types';
import type { Strings } from './i18n';

/**
 * Inline chord annotation matcher. Matches things like `[G]`, `[Am]`, `[C#m7]`, `[F/C]`.
 * Single source of truth — every consumer (parts of bot.ts, format.ts) imports this.
 *
 * Use `CHORD_RE` for `.test()` (non-global, no lastIndex baggage)
 * and `CHORD_RE_GLOBAL` for `.replace()`.
 */
export const CHORD_RE = /\[[A-G][^\]]{0,10}\]/;
export const CHORD_RE_GLOBAL = /\[[A-G][^\]]{0,10}\]/g;

/**
 * Escape all MarkdownV2 special characters so they render as literal text.
 * Must be applied to every piece of user-supplied or dynamic data before
 * embedding it in a MarkdownV2 message.
 * NOTE: do NOT call inside ``` code blocks — content there is never escaped.
 */
export function esc(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

export function hasChordAnnotations(text: string): boolean {
  return CHORD_RE.test(text);
}

/** True when any part of the song contains chord annotations. */
export function songHasChords(song: Pick<SongDto, 'parts'>): boolean {
  return song.parts.some((p) => hasChordAnnotations(p.lyrics));
}

/**
 * Split a long MarkdownV2 message into chunks that each fit within `limit` chars.
 * Splits on newline boundaries when possible; falls back to a hard mid-line split
 * for pathological lines longer than `limit` (so we never overflow Telegram's cap).
 */
export function splitMessage(text: string, limit: number): string[] {
  const chunks: string[] = [];
  let current = '';
  for (const line of text.split('\n')) {
    if (line.length > limit) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      for (let i = 0; i < line.length; i += limit) chunks.push(line.slice(i, i + limit));
      continue;
    }
    if ((current + '\n' + line).length > limit) {
      if (current) chunks.push(current);
      current = line;
    } else {
      current = current ? current + '\n' + line : line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/** Strip inline chord annotations like [G], [Am], [C#m7], [F/C] from a line. */
function stripChords(text: string): string {
  return text.replace(CHORD_RE_GLOBAL, '').replace(/  +/g, ' ').trim();
}

/**
 * Build a chord-above-lyrics representation for a single line.
 * Returns null if the line has no chord annotations.
 *
 * Input:  "[G]Amazing [C]grace how [G]sweet"
 * Output: { chordLine: "G       C         G", textLine: "Amazing grace how sweet" }
 *
 * Uses column tracking so each chord is placed directly above the syllable
 * it belongs to.
 */
function buildChordLine(line: string): { chordLine: string; textLine: string } | null {
  if (!hasChordAnnotations(line)) return null;

  const tokens = line.split(/(\[[A-G][^\]]{0,10}\])/);
  let chordRow = '';
  let textRow = '';

  for (const token of tokens) {
    const m = token.match(/^\[([^\]]+)\]$/);
    if (m) {
      const chord = m[1];
      const col = textRow.length;
      if (chordRow.length < col) {
        chordRow = chordRow.padEnd(col);
      } else if (chordRow.length > 0 && chordRow.length >= col) {
        chordRow += ' ';
      }
      chordRow += chord;
    } else {
      textRow += token;
    }
  }

  return { chordLine: chordRow.trimEnd(), textLine: textRow };
}

function formatLyricsWithChords(lyrics: string): string {
  return lyrics
    .split('\n')
    .flatMap((line) => {
      const built = buildChordLine(line);
      return built ? [built.chordLine, built.textLine] : [line];
    })
    .join('\n');
}

// ── Song detail ───────────────────────────────────────────────────────────────

/**
 * Format a full song for display in Telegram (MarkdownV2). No emojis — header
 * is title + meta line + optional author/copyright line, then parts.
 *
 * @param showChords  When true, chord annotations are rendered above the
 *                    corresponding syllables inside a ``` code block.
 *                    When false, chords are stripped and lyrics are escaped
 *                    as normal MarkdownV2 text.
 */
export function formatSong(song: SongDto, t: Strings, showChords: boolean): string {
  const partLabels: Record<string, string> = {
    verse: t.part_verse,
    chorus: t.part_chorus,
    bridge: t.part_bridge,
    intro: t.part_intro,
    outro: t.part_outro,
    coda: t.part_coda,
  };

  const lines: string[] = [];

  lines.push(`*№${song.number} · ${esc(song.title)}*`);
  lines.push(`_${esc(song.songbook.title)}_`);

  // Combine author + copyright on a single italic meta line when present
  const meta: string[] = [];
  if (song.author) meta.push(`by ${esc(song.author)}`);
  if (song.copyright) meta.push(`© ${esc(song.copyright)}`);
  if (meta.length) lines.push(`_${meta.join(' · ')}_`);

  lines.push('');

  // Render each part as a self-contained block. A single blank line between
  // parts is enough separation — no em-dash, no double gap.
  const partBlocks: string[] = [];
  let verseIndex = 0;

  for (const part of song.parts) {
    let label: string;
    if (part.type === 'verse') {
      verseIndex++;
      label = `${partLabels.verse} ${verseIndex}`;
    } else {
      label = partLabels[part.type] ?? esc(part.label);
    }

    const block: string[] = [`*${esc(label)}*`];
    const partHasChords = hasChordAnnotations(part.lyrics);

    if (showChords && partHasChords) {
      block.push('```');
      block.push(formatLyricsWithChords(part.lyrics));
      block.push('```');
    } else {
      block.push(esc(stripChords(part.lyrics)));
    }

    partBlocks.push(block.join('\n'));
  }

  lines.push(partBlocks.join('\n\n'));

  return lines.join('\n').trimEnd();
}

// ── Song list (per songbook) ──────────────────────────────────────────────────

export function formatSongList(
  items: SongListItemDto[],
  songbook: SongbookDto,
  page: number,
  total: number,
  limit: number,
  t: Strings,
): string {
  const pages = Math.ceil(total / limit);
  return [
    `*${esc(songbook.title)}*`,
    t.song_list_meta(songbook.language, total, page + 1, pages),
  ].join('\n');
}

// ── Search results ────────────────────────────────────────────────────────────

/** Render a list of search-result rows. Songbook label appended only when present. */
function renderResultRows(items: ReadonlyArray<{ number: number; title: string; songbook?: { title: string } }>): string[] {
  return items.map((s) =>
    s.songbook ? `*№${s.number}* · ${esc(s.title)} — _${esc(s.songbook.title)}_` : `*№${s.number}* · ${esc(s.title)}`,
  );
}

export function formatSearchResults(items: SongSearchResultDto[], query: string, total: number, t: Strings): string {
  if (items.length === 0) return t.search_no_results(esc(query));
  const note = total > items.length ? t.search_truncated(items.length, total) : '';
  return note + [t.search_header(esc(query)), ...renderResultRows(items)].join('\n');
}

/** Same as `formatSearchResults` but scoped to a single songbook (no per-row songbook label). */
export function formatInBookSearchResults(
  items: SongListItemDto[],
  query: string,
  bookTitle: string,
  total: number,
  t: Strings,
): string {
  const note = total > items.length ? t.search_truncated(items.length, total) : '';
  return note + [t.search_in_book_header(esc(query), esc(bookTitle)), ...renderResultRows(items)].join('\n');
}
