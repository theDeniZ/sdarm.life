import type { SongDto, SongListItemDto, SongSearchResultDto, SongbookDto } from '@sdarm/types';
import type { Strings } from './i18n';

/**
 * Escape all MarkdownV2 special characters so they render as literal text.
 * Must be applied to every piece of user-supplied or dynamic data before
 * embedding it in a MarkdownV2 message.
 * NOTE: do NOT call inside ``` code blocks — content there is never escaped.
 */
export function esc(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

/**
 * Strip inline chord annotations like [G], [Am], [C#m7], [F/C] from a line.
 */
function stripChords(text: string): string {
  return text.replace(/\[[A-G][^\]]{0,10}\]/g, '').replace(/  +/g, ' ').trim();
}

/**
 * Check whether a lyrics string contains any chord annotations.
 */
function hasChordAnnotations(text: string): boolean {
  return /\[[A-G][^\]]{0,10}\]/.test(text);
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

  // Split on chord markers while keeping them as tokens
  const tokens = line.split(/(\[[A-G][^\]]{0,10}\])/);
  let chordRow = '';
  let textRow = '';

  for (const token of tokens) {
    const m = token.match(/^\[([^\]]+)\]$/);
    if (m) {
      const chord = m[1];
      const col = textRow.length;
      if (chordRow.length < col) {
        // Pad chord row to reach the target column
        chordRow = chordRow.padEnd(col);
      } else if (chordRow.length > 0 && chordRow.length >= col) {
        // Two chords with no text between them — add a separator space
        chordRow += ' ';
      }
      chordRow += chord;
    } else {
      textRow += token;
    }
  }

  return { chordLine: chordRow.trimEnd(), textLine: textRow };
}

/**
 * Format a multi-line lyrics string with chords positioned above the
 * corresponding syllables. Lines without chord annotations are passed through
 * unchanged. The result is intended for a ``` code block (no MarkdownV2 escaping).
 */
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
 * Format a full song for display in Telegram (MarkdownV2).
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

  lines.push(`🎵 *${esc(song.title)}* \\(№ ${song.number}\\)`);
  lines.push(`📖 _${esc(song.songbook.title)}_`);
  if (song.author) lines.push(`✍️ _${esc(song.author)}_`);
  if (song.copyright) lines.push(`© _${esc(song.copyright)}_`);
  lines.push('');

  let verseIndex = 0;

  for (const part of song.parts) {
    let label: string;
    if (part.type === 'verse') {
      verseIndex++;
      label = `${partLabels.verse} ${verseIndex}`;
    } else {
      label = partLabels[part.type] ?? esc(part.label);
    }

    lines.push(`*${esc(label)}*`);

    const partHasChords = hasChordAnnotations(part.lyrics);

    if (showChords && partHasChords) {
      // Render inside a ``` code block — content is NOT MarkdownV2-escaped
      lines.push('```');
      lines.push(formatLyricsWithChords(part.lyrics));
      lines.push('```');
    } else {
      lines.push(esc(stripChords(part.lyrics)));
    }

    lines.push('');
  }

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
  const lines: string[] = [
    `📖 *${esc(songbook.title)}*`,
    t.song_list_meta(songbook.language, total, page + 1, pages),
    '',
    ...items.map((s) => `*№${s.number}* ${esc(s.title)}`),
  ];
  return lines.join('\n');
}

// ── Search results ────────────────────────────────────────────────────────────

export function formatSearchResults(
  items: SongSearchResultDto[],
  query: string,
  total: number,
  t: Strings,
): string {
  if (items.length === 0) {
    return t.search_no_results(esc(query));
  }

  const note = total > items.length ? t.search_truncated(items.length, total) : '';

  const lines: string[] = [
    t.search_header(esc(query)),
    ...items.map((s) => `*№${s.number}* ${esc(s.title)} — _${esc(s.songbook.title)}_`),
  ];

  return note + lines.join('\n');
}

// ── Songbook list ─────────────────────────────────────────────────────────────

export function formatSongbookList(books: SongbookDto[], t: Strings): string {
  if (books.length === 0) return t.songbooks_empty;
  return t.songbooks_header;
}
