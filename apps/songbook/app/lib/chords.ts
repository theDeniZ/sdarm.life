export interface Token {
  chord: string | null;
  word: string;
}

const CHORD_RE = /\[[A-H][^\]]*\]/;
const CHORD_TOKEN_RE = /(\[([A-H][^\]]*)\])?([^[]*)/;

// Parses "[G]Amazing [C]grace how [D]sweet" into Token[]
// Segments without a preceding chord get chord: null
export function parseChords(line: string): Token[] {
  const tokens: Token[] = [];
  // Match optional [CHORD] followed by text up to the next [ or end
  const re = new RegExp(CHORD_TOKEN_RE.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = re.exec(line)) !== null) {
    if (match.index === line.length) break;
    const chord = match[2] ?? null;
    const word = match[3];
    if (chord !== null || word) {
      tokens.push({ chord, word });
    }
  }
  return tokens;
}

export function hasChords(line: string): boolean {
  return CHORD_RE.test(line);
}

export function stripChords(line: string): string {
  return line.replace(new RegExp(CHORD_RE.source, 'g'), '');
}

// ── TRANSPOSITION ────────────────────────────────────────────────────────────

// German/European notation: H = B-natural, B = B-flat.
// Chromatic scale used for output spelling — index 10 is B (B-flat), index 11 is H (B-natural).
const SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B', 'H'];

// Every accepted root spelling → its semitone index (0–11), German convention.
const ROOT_TO_INDEX: Record<string, number> = {
  C: 0,
  'B#': 0,
  'H#': 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  F: 5,
  'E#': 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  B: 10,
  Bb: 10,
  H: 11,
  Cb: 11,
};

// Indices that keep a flat spelling when the original root was written with a flat.
const FLAT_SPELLING: Record<number, string> = {
  1: 'Db',
  3: 'Eb',
  6: 'Gb',
  8: 'Ab',
};

// Transpose a single chord name (e.g. "Am7", "F#", "Hsus4", "B") by semitones.
// The suffix (m, 7, maj7, sus4, …) is preserved unchanged.
export function transposeChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord;

  // Extract root: letter + optional accidental
  const rootMatch = chord.match(/^[A-H][#b]?/);
  if (!rootMatch) return chord;

  const rawRoot = rootMatch[0];
  const suffix = chord.slice(rawRoot.length);

  const idx = ROOT_TO_INDEX[rawRoot];
  if (idx === undefined) return chord; // unknown root, leave unchanged

  const newIdx = (((idx + semitones) % 12) + 12) % 12;

  // Preserve the writer's flat preference where a conventional flat spelling exists.
  const wasFlat = rawRoot.length === 2 && rawRoot[1] === 'b';
  const newRoot = wasFlat && FLAT_SPELLING[newIdx] ? FLAT_SPELLING[newIdx] : SCALE[newIdx];

  return newRoot + suffix;
}

// Replace every [Chord] token in a lyrics line, transposing by semitones.
export function transposeLine(line: string, semitones: number): string {
  if (semitones === 0) return line;
  return line.replace(/\[([A-H][^\]]*)\]/g, (_, chord) => `[${transposeChord(chord, semitones)}]`);
}

// Detect the tonic of a song by picking the most common root note across all parts.
// Returns null if no chords are present.
export function detectKey(parts: { lyrics: string }[]): string | null {
  const counts: Record<string, number> = {};
  for (const part of parts) {
    for (const line of part.lyrics.split('\n')) {
      const matches = line.matchAll(/\[([A-H][#b]?)[^\]]*\]/g);
      for (const m of matches) {
        const root = m[1];
        counts[root] = (counts[root] ?? 0) + 1;
      }
    }
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [root, count] of Object.entries(counts)) {
    if (count > bestCount) {
      bestCount = count;
      best = root;
    }
  }
  return best;
}
